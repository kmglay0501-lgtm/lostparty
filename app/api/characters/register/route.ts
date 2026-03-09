import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

type RegisterBody = {
  candidateIds?: string[];
};

export async function POST(req: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
      return NextResponse.json(
        {
          ok: false,
          error: "Supabase 환경변수가 없습니다.",
        },
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
        {
          ok: false,
          error: "로그인이 필요합니다.",
        },
        { status: 401 }
      );
    }

    const body = (await req.json().catch(() => ({}))) as RegisterBody;
    const candidateIds = Array.isArray(body.candidateIds)
      ? body.candidateIds.filter((v) => typeof v === "string" && v.trim().length > 0)
      : [];

    if (candidateIds.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          error: "등록할 캐릭터를 선택해줘.",
        },
        { status: 400 }
      );
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { data: candidates, error: candidateError } = await admin
      .from("character_import_candidates")
      .select("*")
      .eq("user_id", user.id)
      .in("id", candidateIds);

    if (candidateError) {
      return NextResponse.json(
        {
          ok: false,
          error: `후보 캐릭터 조회 실패: ${candidateError.message}`,
        },
        { status: 500 }
      );
    }

    if (!candidates || candidates.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          error: "선택한 후보 캐릭터를 찾지 못했어.",
        },
        { status: 404 }
      );
    }

    let registeredCount = 0;

    for (const candidate of candidates) {
      const payload = {
        user_id: user.id,
        import_candidate_id: candidate.id,
        character_name: candidate.character_name,
        server_name: candidate.server_name,
        class_name: candidate.class_name,
        role: candidate.role,
        item_level: candidate.item_level,
        combat_power: candidate.combat_power,
        character_level: candidate.character_level,
        profile_image_url: candidate.profile_image_url,
        expedition_level: candidate.expedition_level,
        title: candidate.title,
        guild_member_grade: candidate.guild_member_grade,
        guild_name: candidate.guild_name,
        character_code: candidate.character_code,
        stats: candidate.stats ?? [],
        tendencies: candidate.tendencies ?? [],
        is_registered: true,
        last_synced_at: new Date().toISOString(),
      };

      const { error: upsertError } = await admin
        .from("characters")
        .upsert(payload, {
          onConflict: "user_id,character_name",
          ignoreDuplicates: false,
        });

      if (upsertError) {
        return NextResponse.json(
          {
            ok: false,
            error: `캐릭터 등록 실패 (${candidate.character_name}): ${upsertError.message}`,
          },
          { status: 400 }
        );
      }

      registeredCount += 1;
    }

    return NextResponse.json({
      ok: true,
      registeredCount,
      message: `선택 캐릭터 등록 완료 (${registeredCount}개)`,
    });
  } catch (error) {
    console.error("[/api/characters/register] error:", error);

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "캐릭터 등록 중 알 수 없는 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}