import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

type ForcePartyBody = {
  postId?: string;
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

    const body = (await req.json().catch(() => ({}))) as ForcePartyBody;
    const postId = body.postId?.trim();

    if (!postId) {
      return NextResponse.json(
        { ok: false, error: "postId가 필요합니다." },
        { status: 400 }
      );
    }

    const { data: post, error: postError } = await admin
      .from("raid_posts")
      .select("id, creator_id")
      .eq("id", postId)
      .maybeSingle();

    if (postError || !post) {
      return NextResponse.json(
        { ok: false, error: "레이드 모집을 찾지 못했어." },
        { status: 404 }
      );
    }

    if (post.creator_id !== user.id) {
      return NextResponse.json(
        { ok: false, error: "내가 만든 모집글만 강제 파티 구성이 가능해." },
        { status: 403 }
      );
    }

    const { data: countData, error: countError } = await admin
      .from("raid_post_applications")
      .select("id", { count: "exact", head: true })
      .eq("post_id", postId);

    if (countError) {
      return NextResponse.json(
        { ok: false, error: "신청 인원 확인 실패" },
        { status: 500 }
      );
    }

    if ((countData as unknown) === null) {
      // no-op
    }

    const { count } = await admin
      .from("raid_post_applications")
      .select("id", { count: "exact", head: true })
      .eq("post_id", postId);

    if ((count ?? 0) < 2) {
      return NextResponse.json(
        { ok: false, error: "2명 이상일 때만 강제 파티 구성이 가능해." },
        { status: 400 }
      );
    }

    const { data, error } = await admin.rpc("force_create_party", {
      p_post_id: postId,
    });

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message || "강제 파티 구성 실패" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      partyId: data,
      message: "강제 파티 구성 완료",
    });
  } catch (error) {
    console.error("[/api/raid/force-party] error:", error);

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "강제 파티 구성 중 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}