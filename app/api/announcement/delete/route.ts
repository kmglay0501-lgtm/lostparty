import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

type DeleteAnnouncementBody = {
  announcementId?: string;
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

    const body = (await req.json().catch(() => ({}))) as DeleteAnnouncementBody;
    const announcementId = body.announcementId?.trim();

    if (!announcementId) {
      return NextResponse.json(
        { ok: false, error: "announcementId가 필요합니다." },
        { status: 400 }
      );
    }

    const { data, error } = await supabase.rpc("delete_site_announcement", {
      p_announcement_id: announcementId,
    });

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message || "공지사항 삭제 실패" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      message:
        typeof data === "object" && data && "message" in data
          ? (data as { message?: string }).message ?? "공지사항 삭제 완료"
          : "공지사항 삭제 완료",
    });
  } catch (error) {
    console.error("[/api/announcements/delete] error:", error);

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "공지사항 삭제 중 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}