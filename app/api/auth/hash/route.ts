import { NextRequest, NextResponse } from "next/server";

async function sha256(input: string) {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const password = String(body?.password || "");

    if (!password) {
      return NextResponse.json(
        { error: "비밀번호가 비어 있어." },
        { status: 400 }
      );
    }

    const hash = await sha256(password);
    return NextResponse.json({ hash });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "해시 생성 실패" },
      { status: 500 }
    );
  }
}