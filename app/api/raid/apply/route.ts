import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

type ApplyRaidBody = {
  postId?: string;
  characterId?: string;
};

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

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
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

    const body = (await req.json().catch(() => ({}))) as ApplyRaidBody;
    const postId = body.postId?.trim();
    const characterId = body.characterId?.trim();

    if (!postId || !characterId) {
      return NextResponse.json(
        { ok: false, error: "postId와 characterId가 필요합니다." },
        { status: 400 }
      );
    }

    const { data: character, error: characterError } = await admin
      .from("characters")
      .select("id, user_id, role")
      .eq("id", characterId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (characterError || !character) {
      return NextResponse.json(
        { ok: false, error: "신청할 캐릭터를 찾지 못했어." },
        { status: 404 }
      );
    }

    const { data: post, error: postError } = await admin
      .from("raid_posts")
      .select("id")
      .eq("id", postId)
      .maybeSingle();

    if (postError || !post) {
      return NextResponse.json(
        { ok: false, error: "레이드 모집을 찾지 못했어." },
        { status: 404 }
      );
    }

    const { error: insertError } = await admin
      .from("raid_post_applications")
      .insert({
        post_id: postId,
        user_id: user.id,
        character_id: character.id,
        role: character.role ?? "dps",
      });

    if (insertError) {
      return NextResponse.json(
        { ok: false, error: insertError.message || "레이드 신청 실패" },
        { status: 400 }
      );
    }

    const { data: party, error: partyError } = await admin
      .from("raid_parties")
      .select("id")
      .eq("post_id", postId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!partyError && party?.id) {
      await admin.rpc("replace_dummy_slot", {
        p_party_id: party.id,
        p_user: user.id,
        p_character: character.id,
        p_role: character.role ?? "dps",
      });
    }

    return NextResponse.json({
      ok: true,
      message: "레이드 신청 완료",
    });
  } catch (error) {
    console.error("[/api/raid/apply] error:", error);

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "레이드 신청 중 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}