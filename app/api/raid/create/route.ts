import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

type CreateRaidBody = {
  raidName?: string;
  difficulty?: string;
  raidTime?: string;
  title?: string;
  description?: string;
  creatorCharacterId?: string;
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

    const raidName = body.raidName?.trim() ?? "";
    const difficulty = body.difficulty?.trim() ?? "";
    const raidTime = body.raidTime?.trim() ?? "";
    const title = body.title?.trim() ?? "";
    const description = body.description?.trim() ?? "";
    const creatorCharacterId = body.creatorCharacterId?.trim() ?? "";

    if (!raidName) {
      return NextResponse.json(
        { ok: false, error: "레이드를 선택해줘." },
        { status: 400 }
      );
    }

    if (!difficulty) {
      return NextResponse.json(
        { ok: false, error: "난이도를 선택해줘." },
        { status: 400 }
      );
    }

    if (!raidTime) {
      return NextResponse.json(
        { ok: false, error: "레이드 시간을 입력해줘." },
        { status: 400 }
      );
    }

    if (!title) {
      return NextResponse.json(
        { ok: false, error: "제목을 입력해줘." },
        { status: 400 }
      );
    }

    if (!creatorCharacterId) {
      return NextResponse.json(
        { ok: false, error: "개설 캐릭터를 선택해줘." },
        { status: 400 }
      );
    }

    const { data, error } = await supabase.rpc("create_raid_post_with_creator", {
      p_raid_name: raidName,
      p_difficulty: difficulty,
      p_raid_time: new Date(raidTime).toISOString(),
      p_title: title,
      p_description: description,
      p_creator_character_id: creatorCharacterId,
    });

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message || "레이드 모집 생성 실패" },
        { status: 400 }
      );
    }

    const payload =
      typeof data === "object" && data ? (data as Record<string, unknown>) : {};

    return NextResponse.json({
      ok: true,
      postId: payload.post_id ?? null,
      totalMembers: payload.total_members ?? null,
      recruitableSlots: payload.recruitable_slots ?? null,
      partyCount: payload.party_count ?? null,
      creatorCharacterId: payload.creator_character_id ?? null,
      creatorCharacterName: payload.creator_character_name ?? null,
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