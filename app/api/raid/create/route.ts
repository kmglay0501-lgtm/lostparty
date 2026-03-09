import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

type CreateRaidBody = {
  raidName?: string;
  difficulty?: string;
  raidTime?: string;
  title?: string;
  description?: string;
  maxMembers?: number;
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

    const body = (await req.json().catch(() => ({}))) as CreateRaidBody;

    const raidName = body.raidName?.trim();
    const difficulty = body.difficulty?.trim() || null;
    const raidTime = body.raidTime?.trim() || null;
    const title = body.title?.trim() || null;
    const description = body.description?.trim() || null;
    const maxMembers =
      typeof body.maxMembers === "number" &&
      body.maxMembers >= 2 &&
      body.maxMembers <= 8
        ? body.maxMembers
        : 8;

    if (!raidName) {
      return NextResponse.json(
        { ok: false, error: "레이드 이름을 입력해줘." },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("raid_posts")
      .insert({
        creator_id: user.id,
        raid_name: raidName,
        difficulty,
        raid_time: raidTime,
        title: title || raidName,
        description,
        max_members: maxMembers,
      })
      .select("id")
      .single();

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message || "레이드 모집 생성 실패" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      postId: data.id,
      message: "레이드 모집 생성 완료",
    });
  } catch (error) {
    console.error("[/api/raid/create] error:", error);

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "레이드 모집 생성 중 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}