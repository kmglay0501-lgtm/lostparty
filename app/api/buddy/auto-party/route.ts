import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function POST() {
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

    const { data, error } = await supabase.rpc("create_buddy_auto_parties");

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message || "깐부 자동 파티 생성 실패" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      createdCount:
        typeof data === "object" && data && "created_count" in data
          ? (data as { created_count?: number }).created_count ?? 0
          : 0,
      message: "깐부 자동 파티 생성 완료",
    });
  } catch (error) {
    console.error("[/api/buddy/auto-party] error:", error);

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "깐부 자동 파티 생성 중 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}