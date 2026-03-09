import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

type AddBuddyBody = {
  loginId?: string;
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

    const body = (await req.json().catch(() => ({}))) as AddBuddyBody;
    const loginId = body.loginId?.trim();

    if (!loginId) {
      return NextResponse.json(
        { ok: false, error: "회원가입 ID를 입력해줘." },
        { status: 400 }
      );
    }

    const { data: target, error: targetError } = await admin
      .from("profiles")
      .select("id")
      .eq("login_id", loginId)
      .maybeSingle();

    if (targetError || !target) {
      return NextResponse.json(
        { ok: false, error: "대상 유저를 찾지 못했어." },
        { status: 404 }
      );
    }

    if (target.id === user.id) {
      return NextResponse.json(
        { ok: false, error: "자기 자신은 깐부 추가할 수 없어." },
        { status: 400 }
      );
    }

    const userLow = user.id < target.id ? user.id : target.id;
    const userHigh = user.id < target.id ? target.id : user.id;

    const { error } = await admin.from("buddy_links").upsert(
      {
        user_low: userLow,
        user_high: userHigh,
      },
      {
        onConflict: "user_low,user_high",
      }
    );

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message || "깐부 추가 실패" },
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