import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

type RespondBuddyBody = {
  requestId?: string;
  action?: "accept" | "reject";
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

    const body = (await req.json().catch(() => ({}))) as RespondBuddyBody;
    const requestId = body.requestId?.trim();
    const action = body.action;

    if (!requestId || !action) {
      return NextResponse.json(
        { ok: false, error: "requestId와 action이 필요합니다." },
        { status: 400 }
      );
    }

    const { data, error } = await supabase.rpc("respond_buddy_request", {
      p_request_id: requestId,
      p_action: action,
    });

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message || "깐부 요청 처리 실패" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      message:
        typeof data === "object" && data && "message" in data
          ? (data as { message?: string }).message ?? "깐부 요청 처리 완료"
          : "깐부 요청 처리 완료",
    });
  } catch (error) {
    console.error("[/api/buddy/respond] error:", error);

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "깐부 요청 처리 중 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}