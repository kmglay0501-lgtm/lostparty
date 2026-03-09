"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AppShell, { PageCard } from "@/components/AppShell";

export default function LoginPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setMessage(error.message || "로그인 실패");
      setLoading(false);
      return;
    }

    router.replace("/");
    router.refresh();
  }

  return (
    <AppShell
      title="로그인"
      subtitle="이메일과 비밀번호로 로그인해."
      rightSlot={
        <div className="flex h-full items-start justify-end">
          <button
            onClick={() => router.push("/")}
            className="cursor-pointer rounded-xl border border-white/15 bg-white/10 px-4 py-2 transition hover:bg-white/20"
          >
            메인으로
          </button>
        </div>
      }
    >
      <PageCard title="로그인">
        {message ? (
          <div className="mb-4 rounded-2xl bg-white/10 px-4 py-3 text-sm text-gray-200">
            {message}
          </div>
        ) : null}

        <form onSubmit={handleLogin} className="space-y-4">
          <input
            className="w-full rounded-xl border border-white/10 bg-black/30 p-3 text-white outline-none"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="이메일"
          />
          <input
            className="w-full rounded-xl border border-white/10 bg-black/30 p-3 text-white outline-none"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="비밀번호"
          />

          <button
            type="submit"
            disabled={loading}
            className="cursor-pointer rounded-xl border border-white/15 bg-white/10 px-4 py-2 transition hover:bg-white/20 disabled:opacity-50"
          >
            {loading ? "로그인 중..." : "로그인"}
          </button>
        </form>

        <button
          onClick={() => router.push("/signup")}
          className="mt-4 cursor-pointer rounded-xl border border-white/15 bg-white/10 px-4 py-2 transition hover:bg-white/20"
        >
          회원가입으로 이동
        </button>
      </PageCard>
    </AppShell>
  );
}