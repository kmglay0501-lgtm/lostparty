import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

type CancelRaidBody = {
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

    const body = (await req.json().catch(() => ({}))) as CancelRaidBody;
    const applicationId = body.applicationId?.trim();

    if (!applicationId) {
      return NextResponse.json(
        { ok: false, error: "applicationId가 필요합니다." },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("raid_post_applications")
      .delete()
      .eq("id", applicationId)
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message || "레이드 신청 취소 실패" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "레이드 신청 취소 완료",
    });
  } catch (error) {
    console.error("[/api/raid/cancel] error:", error);

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "레이드 신청 취소 중 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}