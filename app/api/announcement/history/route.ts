import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function GET() {
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

    const { data: historyRows, error: historyError } = await supabase
      .from("v_announcement_history")
      .select("*");

    if (historyError) {
      return NextResponse.json(
        { ok: false, error: historyError.message || "공지 기록 조회 실패" },
        { status: 400 }
      );
    }

    let isOwner = false;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data: ownerData } = await supabase.rpc("is_current_user_owner");
      isOwner = !!ownerData;
    }

    return NextResponse.json({
      ok: true,
      isOwner,
      rows: historyRows ?? [],
    });
  } catch (error) {
    console.error("[/api/announcements/history] error:", error);

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "공지 기록 조회 중 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}