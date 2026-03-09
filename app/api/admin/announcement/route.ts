import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

type SaveAnnouncementBody = {
  title?: string;
  body?: string;
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

    const body = (await req.json().catch(() => ({}))) as SaveAnnouncementBody;
    const title = body.title?.trim() ?? "";
    const content = body.body?.trim() ?? "";

    const { data, error } = await supabase.rpc("save_site_announcement", {
      p_title: title,
      p_body: content,
    });

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message || "공지 저장 실패" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      announcementId:
        typeof data === "object" && data && "announcement_id" in data
          ? (data as { announcement_id?: string }).announcement_id ?? null
          : null,
      message: "공지 저장 완료",
    });
  } catch (error) {
    console.error("[/api/admin/announcement] error:", error);

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "공지 저장 중 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}