import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

type SaveApiKeyBody = {
  apiKey?: string;
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

    const body = (await req.json().catch(() => ({}))) as SaveApiKeyBody;
    const apiKey = body.apiKey?.trim();

    if (!apiKey) {
      return NextResponse.json(
        { ok: false, error: "API Key를 입력해줘." },
        { status: 400 }
      );
    }

    const { data: profileData } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    if (!profileData) {
      const { error: insertError } = await supabase.from("profiles").insert({
        id: user.id,
        lostark_api_key: apiKey,
      });

      if (insertError) {
        return NextResponse.json(
          { ok: false, error: insertError.message || "API Key 저장 실패" },
          { status: 400 }
        );
      }
    } else {
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          lostark_api_key: apiKey,
        })
        .eq("id", user.id);

      if (updateError) {
        return NextResponse.json(
          { ok: false, error: updateError.message || "API Key 저장 실패" },
          { status: 400 }
        );
      }
    }

    return NextResponse.json({
      ok: true,
      message: "API Key 저장 완료",
    });
  } catch (error) {
    console.error("[/api/account/api-key] error:", error);

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "API Key 저장 중 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}