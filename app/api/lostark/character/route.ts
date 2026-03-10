import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import {
  inferRoleFromClassEngraving,
  inferSynergyCodesFromClassEngraving,
  inferSynergyLabelsFromClassEngraving,
} from "@/lib/lostark/synergy";

type RefreshBody = {
  mode?: string;
  characterName?: string;
};

type LostArkSiblingRow = {
  CharacterName?: string | null;
};

type LostArkProfileResponse = {
  CharacterName?: string;
  CharacterClassName?: string;
  ServerName?: string;
  ItemAvgLevel?: string | null;
  CombatPower?: number | null;
  CharacterImage?: string | null;
};

type LostArkArkPassiveResponse = {
  ArkPassive?: {
    Title?: string | null;
  };
  Title?: string | null;
};

type CharacterRow = {
  id: string;
  user_id: string;
  character_name: string | null;
  class_name: string | null;
  server_name: string | null;
  item_level: number | null;
  combat_power: number | null;
  role: string | null;
  is_registered: boolean;
};

function parseItemLevel(value: string | null | undefined): number | null {
  if (!value) return null;
  const cleaned = value.replace(/,/g, "");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeApiKey(value: string) {
  return value.replace(/^bearer\s+/i, "").trim();
}

function normalizeCharacterNameForApi(value: string | null | undefined) {
  if (!value) return "";
  return value.split("@")[0].trim();
}

async function fetchLostArkJson<T>(
  apiKey: string,
  endpoint: string
): Promise<{ ok: true; data: T } | { ok: false; status: number; text: string }> {
  const res = await fetch(
    `https://developer-lostark.game.onstove.com${endpoint}`,
    {
      method: "GET",
      headers: {
        accept: "application/json",
        authorization: `bearer ${normalizeApiKey(apiKey)}`,
      },
      cache: "no-store",
    }
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return {
      ok: false,
      status: res.status,
      text,
    };
  }

  const data = (await res.json()) as T;
  return {
    ok: true,
    data,
  };
}

async function fetchCharacterSiblings(apiKey: string, characterName: string) {
  return fetchLostArkJson<LostArkSiblingRow[]>(
    apiKey,
    `/characters/${encodeURIComponent(characterName)}/siblings`
  );
}

async function fetchCharacterProfile(apiKey: string, characterName: string) {
  return fetchLostArkJson<LostArkProfileResponse>(
    apiKey,
    `/armories/characters/${encodeURIComponent(characterName)}/profiles`
  );
}

async function fetchCharacterArkPassive(apiKey: string, characterName: string) {
  return fetchLostArkJson<LostArkArkPassiveResponse>(
    apiKey,
    `/armories/characters/${encodeURIComponent(characterName)}/arkpassive`
  );
}

function extractClassEngravingFromArkPassive(
  arkPassive: LostArkArkPassiveResponse | null
) {
  const nestedTitle = arkPassive?.ArkPassive?.Title?.trim();
  if (nestedTitle) return nestedTitle;

  const topLevelTitle = arkPassive?.Title?.trim();
  if (topLevelTitle) return topLevelTitle;

  return null;
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

    if (mode === "sync-candidates") {
      const representativeName = normalizeCharacterNameForApi(body.characterName);

      if (!representativeName) {
        return NextResponse.json(
          { ok: false, error: "대표 캐릭터명을 입력해줘." },
          { status: 400 }
        );
      }

      const siblingsRes = await fetchCharacterSiblings(apiKey, representativeName);

      if (!siblingsRes.ok) {
        return NextResponse.json(
          {
            ok: false,
            error: "원정대 캐릭터 목록을 불러오지 못했어.",
            debug: {
              status: siblingsRes.status,
              text: siblingsRes.text,
            },
          },
          { status: 400 }
        );
      }

      const siblingNames = (siblingsRes.data ?? [])
        .map((row) => normalizeCharacterNameForApi(row.CharacterName))
        .filter((name) => !!name);

      const uniqueNames = Array.from(new Set(siblingNames));

      await supabase
        .from("character_import_candidates")
        .delete()
        .eq("user_id", user.id);

      const candidateRows: Array<Record<string, unknown>> = [];

      for (const siblingName of uniqueNames) {
        const profileRes = await fetchCharacterProfile(apiKey, siblingName);

        if (!profileRes.ok) {
          continue;
        }

        const profile = profileRes.data;

        candidateRows.push({
          user_id: user.id,
          character_name: profile.CharacterName ?? siblingName,
          class_name: profile.CharacterClassName ?? null,
          server_name: profile.ServerName ?? null,
          item_level: parseItemLevel(profile.ItemAvgLevel),
          combat_power:
            typeof profile.CombatPower === "number" ? profile.CombatPower : null,
          profile_image_url: profile.CharacterImage ?? null,
        });
      }

      if (candidateRows.length > 0) {
        const { error: insertError } = await supabase
          .from("character_import_candidates")
          .insert(candidateRows);

        if (insertError) {
          return NextResponse.json(
            {
              ok: false,
              error: insertError.message || "후보 캐릭터 저장 실패",
            },
            { status: 400 }
          );
        }
      }

      return NextResponse.json({
        ok: true,
        importedCount: candidateRows.length,
        message: "원정대 후보 캐릭터 불러오기 완료",
      });
    }

    if (mode === "refresh-registered") {
      const { data: registeredCharacters, error: characterError } = await supabase
        .from("characters")
        .select(
          "id, user_id, character_name, class_name, server_name, item_level, combat_power, role, is_registered"
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
      const failures: Array<{
        characterName: string;
        step: string;
        status?: number;
        text?: string;
        updateError?: string;
      }> = [];

      for (const row of rows) {
        const originalCharacterName = row.character_name?.trim();
        const apiCharacterName = normalizeCharacterNameForApi(originalCharacterName);

        if (!apiCharacterName) {
          failures.push({
            characterName: originalCharacterName ?? "",
            step: "normalizeCharacterNameForApi",
            text: "캐릭터명이 비어 있음",
          });
          continue;
        }

        const [profileRes, arkPassiveRes] = await Promise.all([
          fetchCharacterProfile(apiKey, apiCharacterName),
          fetchCharacterArkPassive(apiKey, apiCharacterName),
        ]);

        if (!profileRes.ok) {
          failures.push({
            characterName: apiCharacterName,
            step: "profiles",
            status: profileRes.status,
            text: profileRes.text,
          });
          continue;
        }

        const profile = profileRes.data;
        const arkPassive = arkPassiveRes.ok ? arkPassiveRes.data : null;

        if (!arkPassiveRes.ok) {
          failures.push({
            characterName: apiCharacterName,
            step: "arkpassive",
            status: arkPassiveRes.status,
            text: arkPassiveRes.text,
          });
        }

        const nextClassName = profile.CharacterClassName ?? row.class_name ?? null;
        const nextServerName = profile.ServerName ?? row.server_name ?? null;
        const nextItemLevel =
          parseItemLevel(profile.ItemAvgLevel) ?? row.item_level ?? null;
        const nextCombatPower =
          typeof profile.CombatPower === "number"
            ? profile.CombatPower
            : row.combat_power ?? null;
        const nextProfileImage = profile.CharacterImage ?? null;

        const nextClassEngraving =
          extractClassEngravingFromArkPassive(arkPassive) ?? null;

        const nextRole = inferRoleFromClassEngraving(
          nextClassName,
          nextClassEngraving,
          row.role
        );

        const nextSynergyCodes = inferSynergyCodesFromClassEngraving(
          nextClassName,
          nextClassEngraving
        );

        const nextSynergyLabels = inferSynergyLabelsFromClassEngraving(
          nextClassName,
          nextClassEngraving
        );

        const { error: updateError } = await supabase
          .from("characters")
          .update({
            class_name: nextClassName,
            server_name: nextServerName,
            item_level: nextItemLevel,
            combat_power: nextCombatPower,
            profile_image_url: nextProfileImage,
            class_engraving: nextClassEngraving,
            role: nextRole,
            synergy_codes: nextSynergyCodes,
            synergy_labels: nextSynergyLabels,
            role_source: nextClassEngraving ? "arkpassive_title" : "fallback",
            synergy_updated_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", row.id);

        if (updateError) {
          failures.push({
            characterName: apiCharacterName,
            step: "db_update",
            updateError: updateError.message,
          });
          continue;
        }

        updatedCount += 1;
      }

      return NextResponse.json({
        ok: true,
        updatedCount,
        failures,
        message:
          failures.length > 0
            ? `등록 캐릭터 갱신 완료 (${updatedCount}명 성공, ${failures.length}명 실패)`
            : "등록 캐릭터 갱신 완료",
      });
    }

    return NextResponse.json(
      { ok: false, error: "지원하지 않는 요청입니다." },
      { status: 400 }
    );
  } catch (error) {
    console.error("[/api/lostark/character] error:", error);

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "등록 캐릭터 처리 중 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}