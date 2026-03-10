import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import {
  inferRoleFromClassEngraving,
  inferSynergyCodesFromClassEngraving,
  inferSynergyLabelsFromClassEngraving,
} from "@/lib/lostark/synergy";

type SetEngravingBody = {
  characterId?: string;
  classEngraving?: string;
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

    const body = (await req.json().catch(() => ({}))) as SetEngravingBody;
    const characterId = body.characterId?.trim();
    const classEngraving = body.classEngraving?.trim();

    if (!characterId) {
      return NextResponse.json(
        { ok: false, error: "characterId가 필요합니다." },
        { status: 400 }
      );
    }

    if (!classEngraving) {
      return NextResponse.json(
        { ok: false, error: "직업각인을 선택해줘." },
        { status: 400 }
      );
    }

    const { data: character, error: characterError } = await supabase
      .from("characters")
      .select("id, user_id, class_name, role")
      .eq("id", characterId)
      .maybeSingle();

    if (characterError || !character) {
      return NextResponse.json(
        { ok: false, error: "캐릭터를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    if (character.user_id !== user.id) {
      return NextResponse.json(
        { ok: false, error: "본인 캐릭터만 수정할 수 있습니다." },
        { status: 403 }
      );
    }

    const nextRole = inferRoleFromClassEngraving(
      character.class_name,
      classEngraving,
      character.role
    );

    const nextSynergyCodes = inferSynergyCodesFromClassEngraving(
      character.class_name,
      classEngraving
    );

    const nextSynergyLabels = inferSynergyLabelsFromClassEngraving(
      character.class_name,
      classEngraving
    );

    const { error: updateError } = await supabase
      .from("characters")
      .update({
        class_engraving: classEngraving,
        role: nextRole,
        synergy_codes: nextSynergyCodes,
        synergy_labels: nextSynergyLabels,
        role_source: "manual_user_selection",
        synergy_updated_at: new Date().toISOString(),
      })
      .eq("id", characterId);

    if (updateError) {
      return NextResponse.json(
        { ok: false, error: updateError.message || "직업각인 저장 실패" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "직업각인 저장 완료",
      role: nextRole,
      synergyLabels: nextSynergyLabels,
    });
  } catch (error) {
    console.error("[/api/characters/set-engraving] error:", error);

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "직업각인 저장 중 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}