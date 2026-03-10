import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

type CancelBody = {
  applicationId?: string;
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

    const body = (await req.json().catch(() => ({}))) as CancelBody;
    const applicationId = body.applicationId?.trim();

    if (!applicationId) {
      return NextResponse.json(
        { ok: false, error: "applicationId가 필요합니다." },
        { status: 400 }
      );
    }

    const { data, error } = await supabase.rpc("cancel_my_raid_application", {
      p_application_id: applicationId,
    });

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message || "신청 취소 실패" },
        { status: 400 }
      );
    }

    const payload =
      typeof data === "object" && data ? (data as Record<string, unknown>) : {};

    return NextResponse.json({
      ok: true,
      postId: typeof payload.post_id === "string" ? payload.post_id : null,
      message:
        typeof payload.message === "string"
          ? payload.message
          : "신청 취소 완료",
    });
  } catch (error) {
    console.error("[/api/raid/cancel] error:", error);

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "신청 취소 중 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}