import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

type ForcePartyBody = {
  postId?: string;
};

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

    const body = (await req.json().catch(() => ({}))) as ForcePartyBody;
    const postId = body.postId?.trim();

    if (!postId) {
      return NextResponse.json(
        { ok: false, error: "postId가 필요합니다." },
        { status: 400 }
      );
    }

    const { data: postData, error: postError } = await supabase
      .from("raid_posts")
      .select("id, creator_id")
      .eq("id", postId)
      .maybeSingle();

    if (postError || !postData) {
      return NextResponse.json(
        { ok: false, error: "모집글을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    if (postData.creator_id !== user.id) {
      return NextResponse.json(
        { ok: false, error: "모집 개설자만 강제 파티 구성을 할 수 있습니다." },
        { status: 403 }
      );
    }

    const { data, error } = await supabase.rpc("force_create_party", {
      p_post_id: postId,
    });

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message || "강제 파티 구성 실패" },
        { status: 400 }
      );
    }

    const payload =
      typeof data === "object" && data ? (data as Record<string, unknown>) : {};

    return NextResponse.json({
      ok: true,
      message:
        typeof payload.message === "string"
          ? payload.message
          : "강제 파티 구성 완료",
      assignedCount:
        typeof payload.assigned_count === "number" ? payload.assigned_count : 0,
      unassignedCount:
        typeof payload.unassigned_count === "number"
          ? payload.unassigned_count
          : 0,
      partyCount:
        typeof payload.party_count === "number" ? payload.party_count : 0,
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