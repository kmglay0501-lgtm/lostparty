import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

type AddBuddyBody = {
  loginId?: string;
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

    const body = (await req.json().catch(() => ({}))) as AddBuddyBody;
    const loginId = body.loginId?.trim();

    if (!loginId) {
      return NextResponse.json(
        { ok: false, error: "회원가입 ID를 입력해줘." },
        { status: 400 }
      );
    }

    const { data: targetProfile, error: targetError } = await supabase
      .from("profiles")
      .select("id, login_id")
      .eq("login_id", loginId)
      .maybeSingle();

    if (targetError) {
      return NextResponse.json(
        { ok: false, error: targetError.message || "회원 조회 실패" },
        { status: 400 }
      );
    }

    if (!targetProfile) {
      return NextResponse.json(
        { ok: false, error: "해당 회원가입 ID를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    if (targetProfile.id === user.id) {
      return NextResponse.json(
        { ok: false, error: "자기 자신은 깐부로 추가할 수 없습니다." },
        { status: 400 }
      );
    }

    const userLow = user.id < targetProfile.id ? user.id : targetProfile.id;
    const userHigh = user.id < targetProfile.id ? targetProfile.id : user.id;

    const { data: existingLink, error: existingError } = await supabase
      .from("buddy_links")
      .select("user_low, user_high")
      .eq("user_low", userLow)
      .eq("user_high", userHigh)
      .maybeSingle();

    if (existingError) {
      return NextResponse.json(
        { ok: false, error: existingError.message || "깐부 중복 확인 실패" },
        { status: 400 }
      );
    }

    if (existingLink) {
      return NextResponse.json(
        { ok: false, error: "이미 등록된 깐부입니다." },
        { status: 409 }
      );
    }

    const { error: insertError } = await supabase.from("buddy_links").insert({
      user_low: userLow,
      user_high: userHigh,
      created_by: user.id,
    });

    if (insertError) {
      if (insertError.code === "23505") {
        return NextResponse.json(
          { ok: false, error: "이미 등록된 깐부입니다." },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { ok: false, error: insertError.message || "깐부 추가 실패" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "깐부 추가 완료",
    });
  } catch (error) {
    console.error("[/api/buddy/add] error:", error);

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "깐부 추가 중 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}