"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignUpPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginId, setLoginId] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [guildName, setGuildName] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSignUp(e: FormEvent) {
    e.preventDefault();
    setMessage("");

    const normalizedEmail = email.trim();
    const normalizedPassword = password.trim();
    const normalizedLoginId = loginId.trim();
    const normalizedDisplayName = displayName.trim();
    const normalizedGuildName = guildName.trim();

    if (!normalizedEmail || !normalizedPassword || !normalizedLoginId || !normalizedDisplayName) {
      setMessage("필수 항목을 모두 입력해줘.");
      return;
    }

    setLoading(true);

    try {
      const { data: duplicatedProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("login_id", normalizedLoginId)
        .maybeSingle();

      if (duplicatedProfile) {
        setMessage("이미 사용 중인 회원가입 ID야.");
        setLoading(false);
        return;
      }

      const { error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password: normalizedPassword,
        options: {
          data: {
            login_id: normalizedLoginId,
            display_name: normalizedDisplayName,
            guild_name: normalizedGuildName || null,
          },
        },
      });

      if (error) {
        setMessage(error.message || "회원가입 실패");
        setLoading(false);
        return;
      }

      setMessage("이메일로 인증해주세요.");
      setTimeout(() => {
        router.replace("/login");
      }, 1000);
    } catch (error) {
      console.error(error);
      setMessage("회원가입 중 오류가 발생했어.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-xl p-6">
      <div className="rounded-2xl border p-6">
        <h1 className="text-2xl font-bold">회원가입</h1>

        <form onSubmit={handleSignUp} className="mt-6 space-y-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border px-4 py-3"
            placeholder="이메일"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border px-4 py-3"
            placeholder="비밀번호"
          />
          <input
            value={loginId}
            onChange={(e) => setLoginId(e.target.value)}
            className="w-full rounded-xl border px-4 py-3"
            placeholder="회원가입 ID"
          />
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full rounded-xl border px-4 py-3"
            placeholder="표시 이름"
          />
          <input
            value={guildName}
            onChange={(e) => setGuildName(e.target.value)}
            className="w-full rounded-xl border px-4 py-3"
            placeholder="길드명"
          />

          {message ? (
            <div className="rounded-xl bg-gray-100 px-4 py-3 text-sm">
              {message}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl border px-4 py-3"
          >
            {loading ? "가입 중..." : "회원가입"}
          </button>
        </form>
      </div>
    </main>
  );
}