import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

type SaveApiKeyBody = {
  apiKey?: string;
};

function normalizeApiKey(value: string) {
  return value.replace(/^bearer\s+/i, "").trim();
}

function maskApiKeyForDisplay(apiKey: string | null | undefined) {
  const normalized = normalizeApiKey(apiKey ?? "");
  if (!normalized) return null;
  return `${normalized.slice(0, 3)}********`;
}

function createSupabaseServerClient(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase 환경변수가 없습니다.");
  }

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set() {},
      remove() {},
    },
  });
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const supabase = createSupabaseServerClient(cookieStore);

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

    const { data, error } = await supabase
      .from("profiles")
      .select("lostark_api_key")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message || "API Key 조회 실패" },
        { status: 400 }
      );
    }

    const apiKey =
      (data as { lostark_api_key?: string | null } | null)?.lostark_api_key ??
      null;

    return NextResponse.json({
      ok: true,
      hasApiKey: !!apiKey,
      maskedApiKey: maskApiKeyForDisplay(apiKey),
    });
  } catch (error) {
    console.error("[GET /api/account/api-key] error:", error);

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "API Key 조회 중 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createSupabaseServerClient(cookieStore);

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
    const rawApiKey = body.apiKey?.trim();

    if (!rawApiKey) {
      return NextResponse.json(
        { ok: false, error: "API Key를 입력해줘." },
        { status: 400 }
      );
    }

    const normalizedApiKey = normalizeApiKey(rawApiKey);

    if (!normalizedApiKey) {
      return NextResponse.json(
        { ok: false, error: "유효한 API Key를 입력해줘." },
        { status: 400 }
      );
    }

    const { data: existingProfile, error: selectError } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    if (selectError) {
      return NextResponse.json(
        { ok: false, error: selectError.message || "프로필 조회 실패" },
        { status: 400 }
      );
    }

    if (!existingProfile) {
      const { error: insertError } = await supabase.from("profiles").insert({
        id: user.id,
        login_id: user.user_metadata?.login_id ?? null,
        display_name: user.user_metadata?.display_name ?? null,
        guild_name: user.user_metadata?.guild_name ?? null,
        lostark_api_key: normalizedApiKey,
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
          lostark_api_key: normalizedApiKey,
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
      hasApiKey: true,
      maskedApiKey: maskApiKeyForDisplay(normalizedApiKey),
    });
  } catch (error) {
    console.error("[POST /api/account/api-key] error:", error);

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

export async function DELETE() {
  try {
    const cookieStore = await cookies();
    const supabase = createSupabaseServerClient(cookieStore);

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

    const { error } = await supabase
      .from("profiles")
      .update({
        lostark_api_key: null,
      })
      .eq("id", user.id);

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message || "API Key 삭제 실패" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "API Key 삭제 완료",
      hasApiKey: false,
      maskedApiKey: null,
    });
  } catch (error) {
    console.error("[DELETE /api/account/api-key] error:", error);

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "API Key 삭제 중 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}