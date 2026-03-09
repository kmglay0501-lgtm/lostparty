import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

const LOSTARK_API = "https://developer-lostark.game.onstove.com";

type LostArkSibling = {
  ServerName?: string;
  CharacterName?: string;
  CharacterLevel?: number;
  CharacterClassName?: string;
  ItemAvgLevel?: string;
  ItemMaxLevel?: string;
};

type LostArkProfile = {
  CharacterImage?: string;
  ExpeditionLevel?: number;
  Title?: string;
  GuildMemberGrade?: string;
  GuildName?: string;
  ServerName?: string;
  CharacterName?: string;
  CharacterLevel?: number;
  CharacterClassName?: string;
  ItemAvgLevel?: string;
  ItemMaxLevel?: string;
  CombatPower?: string | number;
  CharacterCode?: string;
  Stats?: Array<{
    Type?: string;
    Value?: string;
    Tooltip?: string[];
  }>;
  Tendencies?: Array<{
    Type?: string;
    Point?: number;
    MaxPoint?: number;
  }>;
};

type SyncRequestBody = {
  mode?: "import-candidates" | "refresh-registered";
  seedCharacterName?: string;
};

function normalizeApiKey(key: string) {
  const trimmed = key.trim();
  return /^bearer\s+/i.test(trimmed) ? trimmed : `bearer ${trimmed}`;
}

function parseNumber(value?: string | number | null): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const parsed = Number(String(value).replace(/,/g, "").trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function inferRole(className?: string | null): string {
  const value = (className ?? "").trim().toLowerCase();
  const supportKeywords = [
    "bard",
    "artist",
    "paladin",
    "holy knight",
    "바드",
    "도화가",
    "홀리나이트",
    "홀리 나이트",
  ];

  return supportKeywords.some((keyword) => value.includes(keyword))
    ? "support"
    : "dps";
}

function toDisplayCharacterName(name?: string | null, server?: string | null) {
  const safeName = (name ?? "").trim();
  const safeServer = (server ?? "").trim();

  if (!safeName) return null;
  return safeServer ? `${safeName}@${safeServer}` : safeName;
}

async function fetchProfile(
  apiKey: string,
  baseCharacterName: string
): Promise<LostArkProfile> {
  const res = await fetch(
    `${LOSTARK_API}/armories/characters/${encodeURIComponent(
      baseCharacterName
    )}/profiles`,
    {
      headers: {
        accept: "application/json",
        authorization: normalizeApiKey(apiKey),
      },
      cache: "no-store",
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `프로필 조회 실패 (${baseCharacterName}): ${res.status} ${text}`
    );
  }

  return (await res.json()) as LostArkProfile;
}

export async function POST(req: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
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

    const body = (await req.json().catch(() => ({}))) as SyncRequestBody;
    const mode = body.mode ?? "import-candidates";

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { data: apiKeyData, error: apiKeyError } = await admin.rpc(
      "admin_get_lostark_api_key",
      { p_user_id: user.id }
    );

    if (apiKeyError) {
      return NextResponse.json(
        { ok: false, error: `API Key 조회 실패: ${apiKeyError.message}` },
        { status: 500 }
      );
    }

    if (!apiKeyData || typeof apiKeyData !== "string") {
      return NextResponse.json(
        { ok: false, error: "내 Lost Ark API Key가 등록되어 있지 않습니다." },
        { status: 400 }
      );
    }

    if (mode === "import-candidates") {
      const seedCharacterName = body.seedCharacterName?.trim();

      if (!seedCharacterName) {
        return NextResponse.json(
          { ok: false, error: "대표 캐릭터명을 입력해줘." },
          { status: 400 }
        );
      }

      const siblingsRes = await fetch(
        `${LOSTARK_API}/characters/${encodeURIComponent(seedCharacterName)}/siblings`,
        {
          headers: {
            accept: "application/json",
            authorization: normalizeApiKey(apiKeyData),
          },
          cache: "no-store",
        }
      );

      if (!siblingsRes.ok) {
        const text = await siblingsRes.text();
        return NextResponse.json(
          {
            ok: false,
            error: `원정대 캐릭터 조회 실패: ${siblingsRes.status} ${text}`,
          },
          { status: 500 }
        );
      }

      const siblings = (await siblingsRes.json()) as LostArkSibling[];

      if (!Array.isArray(siblings) || siblings.length === 0) {
        return NextResponse.json(
          { ok: false, error: "원정대 캐릭터를 찾지 못했습니다." },
          { status: 404 }
        );
      }

      const savedCandidates: string[] = [];

      for (const sibling of siblings) {
        const baseName = sibling.CharacterName?.trim();
        const serverName = sibling.ServerName?.trim() ?? null;
        const displayName = toDisplayCharacterName(baseName, serverName);

        if (!baseName || !displayName) continue;

        const profile = await fetchProfile(apiKeyData, baseName);

        const payload = {
          user_id: user.id,
          character_name: displayName,
          server_name: profile.ServerName?.trim() || serverName,
          class_name:
            profile.CharacterClassName?.trim() ||
            sibling.CharacterClassName?.trim() ||
            null,
          role: inferRole(
            profile.CharacterClassName?.trim() ||
              sibling.CharacterClassName?.trim()
          ),
          item_level:
            parseNumber(profile.ItemAvgLevel) ??
            parseNumber(sibling.ItemAvgLevel),
          combat_power: parseNumber(profile.CombatPower),
          character_level:
            parseNumber(profile.CharacterLevel) ??
            parseNumber(sibling.CharacterLevel),
          profile_image_url: profile.CharacterImage ?? null,
          expedition_level: parseNumber(profile.ExpeditionLevel),
          title: profile.Title ?? null,
          guild_member_grade: profile.GuildMemberGrade ?? null,
          guild_name: profile.GuildName ?? null,
          character_code: profile.CharacterCode ?? null,
          stats: Array.isArray(profile.Stats) ? profile.Stats : [],
          tendencies: Array.isArray(profile.Tendencies) ? profile.Tendencies : [],
          raw_payload: profile,
          imported_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const { error } = await admin
          .from("character_import_candidates")
          .upsert(payload, {
            onConflict: "user_id,character_name",
          });

        if (error) {
          throw new Error(
            `후보 캐릭터 저장 실패 (${displayName}): ${error.message}`
          );
        }

        savedCandidates.push(displayName);
      }

      return NextResponse.json({
        ok: true,
        mode,
        message: "원정대 캐릭터 후보 동기화 완료",
        count: savedCandidates.length,
        candidates: savedCandidates,
      });
    }

    const { data: registeredCharacters, error: registeredError } = await admin
      .from("characters")
      .select("id, character_name, server_name")
      .eq("user_id", user.id)
      .eq("is_registered", true);

    if (registeredError) {
      return NextResponse.json(
        { ok: false, error: `등록 캐릭터 조회 실패: ${registeredError.message}` },
        { status: 500 }
      );
    }

    if (!registeredCharacters || registeredCharacters.length === 0) {
      return NextResponse.json(
        { ok: false, error: "등록된 캐릭터가 없습니다." },
        { status: 400 }
      );
    }

    const refreshed: string[] = [];

    for (const row of registeredCharacters) {
      const storedName = row.character_name ?? "";
      const baseName = storedName.includes("@")
        ? storedName.split("@")[0]
        : storedName;

      if (!baseName) continue;

      const profile = await fetchProfile(apiKeyData, baseName);
      const serverName = profile.ServerName?.trim() || row.server_name || null;
      const displayName = toDisplayCharacterName(baseName, serverName);

      if (!displayName) continue;

      const updatePayload = {
        character_name: displayName,
        server_name: serverName,
        class_name: profile.CharacterClassName?.trim() || null,
        role: inferRole(profile.CharacterClassName?.trim() || null),
        item_level: parseNumber(profile.ItemAvgLevel),
        combat_power: parseNumber(profile.CombatPower),
        character_level: parseNumber(profile.CharacterLevel),
        profile_image_url: profile.CharacterImage ?? null,
        expedition_level: parseNumber(profile.ExpeditionLevel),
        title: profile.Title ?? null,
        guild_member_grade: profile.GuildMemberGrade ?? null,
        guild_name: profile.GuildName ?? null,
        character_code: profile.CharacterCode ?? null,
        stats: Array.isArray(profile.Stats) ? profile.Stats : [],
        tendencies: Array.isArray(profile.Tendencies) ? profile.Tendencies : [],
        last_synced_at: new Date().toISOString(),
      };

      const { error: updateError } = await admin
        .from("characters")
        .update(updatePayload)
        .eq("id", row.id)
        .eq("user_id", user.id);

      if (updateError) {
        throw new Error(
          `등록 캐릭터 갱신 실패 (${displayName}): ${updateError.message}`
        );
      }

      refreshed.push(displayName);
    }

    return NextResponse.json({
      ok: true,
      mode,
      message: "등록된 캐릭터 정보 갱신 완료",
      count: refreshed.length,
      characters: refreshed,
    });
  } catch (error) {
    console.error("[/api/lostark/character] error:", error);

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "캐릭터 동기화 중 알 수 없는 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}