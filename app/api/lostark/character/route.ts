import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import {
  getKnownClassEngravings,
  inferRoleFromClassEngraving,
  inferSynergyCodesFromClassEngraving,
  inferSynergyLabelsFromClassEngraving,
} from "@/lib/lostark/synergy";

type LostArkProfileResponse = {
  CharacterName?: string;
  CharacterClassName?: string;
  ServerName?: string;
  ItemAvgLevel?: string | null;
  CombatPower?: number | null;
};

type LostArkEngravingResponse = {
  ArkPassiveEffects?: Array<{
    Name?: string;
    Grade?: string;
    Level?: number;
  }>;
  Effects?: Array<{
    Name?: string;
    Tooltip?: string;
  }>;
  Engravings?: Array<{
    Name?: string;
    Tooltip?: string;
  }>;
};

type LostArkArkPassiveResponse = {
  IsArkPassive?: boolean;
  Effects?: Array<{
    Name?: string;
    Description?: string;
    Icon?: string;
  }>;
  Points?: Array<{
    Name?: string;
    Value?: number;
    Description?: string;
  }>;
};

type CharacterRow = {
  id: string;
  user_id: string;
  character_name: string | null;
  class_name: string | null;
  server_name: string | null;
  item_level: number | null;
  combat_power: number | null;
  profile_image_url: string | null;
  role: string | null;
  is_registered: boolean;
};

type RefreshBody = {
  mode?: string;
};

function parseItemLevel(value: string | null | undefined): number | null {
  if (!value) return null;
  const cleaned = value.replace(/,/g, "");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeText(value: string | null | undefined) {
  return (value ?? "")
    .replace(/[()\[\]{}:·.,/\\\-_\s]/g, "")
    .trim()
    .toLowerCase();
}

function uniqueTexts(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(values.map((v) => (v ?? "").trim()).filter((v) => v.length > 0))
  );
}

function matchKnownEngraving(
  className: string | null | undefined,
  texts: string[]
) {
  const known = getKnownClassEngravings(className);
  const normalizedKnown = known.map((value) => ({
    raw: value,
    normalized: normalizeText(value),
  }));

  const normalizedTexts = texts.map((value) => ({
    raw: value,
    normalized: normalizeText(value),
  }));

  for (const knownItem of normalizedKnown) {
    for (const textItem of normalizedTexts) {
      if (
        textItem.normalized === knownItem.normalized ||
        textItem.normalized.includes(knownItem.normalized) ||
        knownItem.normalized.includes(textItem.normalized)
      ) {
        return knownItem.raw;
      }
    }
  }

  return null;
}

function pickClassEngraving(
  className: string | null | undefined,
  engravings: LostArkEngravingResponse | null,
  arkPassive: LostArkArkPassiveResponse | null
) {
  const arkTexts = uniqueTexts([
    ...(arkPassive?.Effects?.map((row) => row?.Name ?? "") ?? []),
    ...(arkPassive?.Effects?.map((row) => row?.Description ?? "") ?? []),
    ...(arkPassive?.Points?.map((row) => row?.Name ?? "") ?? []),
    ...(arkPassive?.Points?.map((row) => row?.Description ?? "") ?? []),
  ]);

  const fromArkPassive = matchKnownEngraving(className, arkTexts);
  if (fromArkPassive) return fromArkPassive;

  const engravingTexts = uniqueTexts([
    ...(engravings?.ArkPassiveEffects?.map((row) => row?.Name ?? "") ?? []),
    ...(engravings?.Effects?.map((row) => row?.Name ?? "") ?? []),
    ...(engravings?.Engravings?.map((row) => row?.Name ?? "") ?? []),
  ]);

  const fromEngravings = matchKnownEngraving(className, engravingTexts);
  if (fromEngravings) return fromEngravings;

  return null;
}

async function fetchLostArkJson<T>(
  apiKey: string,
  endpoint: string
): Promise<T | null> {
  const res = await fetch(`https://developer-lostark.game.onstove.com${endpoint}`, {
    method: "GET",
    headers: {
      accept: "application/json",
      authorization: apiKey.startsWith("bearer ")
        ? apiKey
        : `bearer ${apiKey}`,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    return null;
  }

  return (await res.json()) as T;
}

export async function POST(req: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { ok: false, error: "Supabase 환경변수가 없습니다." },
        { status: 500 }
      );
    }

    const cookieStore = await cookies();

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set() {},
        remove() {},
      },
    });

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { ok: false, error: "로그인이 필요합니다." },
        { status: 401 }
      );
    }

    const body = (await req.json().catch(() => ({}))) as RefreshBody;
    const mode = body.mode?.trim() ?? "";

    if (mode !== "refresh-registered") {
      return NextResponse.json(
        { ok: false, error: "지원하지 않는 요청입니다." },
        { status: 400 }
      );
    }

    const { data: accountData, error: accountError } = await supabase
      .from("profiles")
      .select("lostark_api_key")
      .eq("id", user.id)
      .maybeSingle();

    if (accountError) {
      return NextResponse.json(
        { ok: false, error: accountError.message || "API Key 조회 실패" },
        { status: 400 }
      );
    }

    const apiKey = (accountData as { lostark_api_key?: string | null } | null)
      ?.lostark_api_key;

    if (!apiKey) {
      return NextResponse.json(
        { ok: false, error: "저장된 로스트아크 API Key가 없습니다." },
        { status: 400 }
      );
    }

    const { data: registeredCharacters, error: characterError } = await supabase
      .from("characters")
      .select(
        "id, user_id, character_name, class_name, server_name, item_level, combat_power, profile_image_url, role, is_registered"
      )
      .eq("user_id", user.id)
      .eq("is_registered", true)
      .order("updated_at", { ascending: false });

    if (characterError) {
      return NextResponse.json(
        { ok: false, error: characterError.message || "캐릭터 조회 실패" },
        { status: 400 }
      );
    }

    const rows = (registeredCharacters as CharacterRow[]) ?? [];
    let updatedCount = 0;

    for (const row of rows) {
      const characterName = row.character_name?.trim();
      if (!characterName) continue;

      const encodedName = encodeURIComponent(characterName);

      const [profile, engravings, arkPassive] = await Promise.all([
        fetchLostArkJson<LostArkProfileResponse>(
          apiKey,
          `/armories/characters/${encodedName}/profiles`
        ),
        fetchLostArkJson<LostArkEngravingResponse>(
          apiKey,
          `/armories/characters/${encodedName}/engravings`
        ),
        fetchLostArkJson<LostArkArkPassiveResponse>(
          apiKey,
          `/armories/characters/${encodedName}/arkpassive`
        ),
      ]);

      const nextClassName = profile?.CharacterClassName ?? row.class_name ?? null;
      const nextServerName = profile?.ServerName ?? row.server_name ?? null;
      const nextItemLevel =
        parseItemLevel(profile?.ItemAvgLevel) ?? row.item_level ?? null;
      const nextCombatPower =
        typeof profile?.CombatPower === "number"
          ? profile.CombatPower
          : row.combat_power ?? null;

      const classEngraving = pickClassEngraving(
        nextClassName,
        engravings,
        arkPassive
      );

      const nextRole = inferRoleFromClassEngraving(
        nextClassName,
        classEngraving,
        row.role
      );

      const nextSynergyCodes = inferSynergyCodesFromClassEngraving(
        nextClassName,
        classEngraving
      );

      const nextSynergyLabels = inferSynergyLabelsFromClassEngraving(
        nextClassName,
        classEngraving
      );

      const { error: updateError } = await supabase
        .from("characters")
        .update({
          class_name: nextClassName,
          server_name: nextServerName,
          item_level: nextItemLevel,
          combat_power: nextCombatPower,
          class_engraving: classEngraving,
          role: nextRole,
          synergy_codes: nextSynergyCodes,
          synergy_labels: nextSynergyLabels,
          role_source: classEngraving ? "latest_user_mapping" : "fallback",
          synergy_updated_at: new Date().toISOString(),
        })
        .eq("id", row.id);

      if (!updateError) {
        updatedCount += 1;
      }
    }

    return NextResponse.json({
      ok: true,
      updatedCount,
      message: "등록 캐릭터 갱신 완료",
    });
  } catch (error) {
    console.error("[/api/lostark/character] error:", error);

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "등록 캐릭터 갱신 중 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}