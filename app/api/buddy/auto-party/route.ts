import { NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase/server";

export async function POST() {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("create_buddy_auto_parties");

  if (error) {
    return NextResponse.json({
      ok: false,
      error: error.message,
    });
  }

  const payload =
    typeof data === "object" && data ? (data as Record<string, unknown>) : {};

  return NextResponse.json({
    ok: true,
    created:
      typeof payload.created === "number"
        ? payload.created
        : typeof payload.created_count === "number"
        ? payload.created_count
        : 0,
  });
}