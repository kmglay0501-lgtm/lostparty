"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AppShell, { PageCard } from "@/components/AppShell";

export default function SignupPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [loginId, setLoginId] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [guildName, setGuildName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function handleSignup(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      if (!loginId.trim()) {
        setErrorMessage("회원가입 ID를 입력해줘.");
        return;
      }

      if (!displayName.trim()) {
        setErrorMessage("표시 닉네임을 입력해줘.");
        return;
      }

      if (!email.trim()) {
        setErrorMessage("이메일을 입력해줘.");
        return;
      }

      if (!password.trim()) {
        setErrorMessage("비밀번호를 입력해줘.");
        return;
      }

      const redirectTo =
        typeof window !== "undefined"
          ? `${window.location.origin}/login`
          : undefined;

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: redirectTo,
          data: {
            login_id: loginId.trim(),
            display_name: displayName.trim(),
            guild_name: guildName.trim() || null,
          },
        },
      });

      if (error) {
        setErrorMessage(error.message || "회원가입에 실패했어.");
        return;
      }

      const user = data.user;

      if (!user) {
        setErrorMessage("회원가입 처리 중 사용자 정보를 확인하지 못했어.");
        return;
      }

      const { error: profileError } = await supabase.from("profiles").upsert({
        id: user.id,
        login_id: loginId.trim(),
        display_name: displayName.trim(),
        guild_name: guildName.trim() || null,
      });

      if (profileError) {
        setErrorMessage(profileError.message || "프로필 저장에 실패했어.");
        return;
      }

      const identities = user.identities ?? [];
      const emailIdentityExists = identities.some(
        (identity) => identity.provider === "email"
      );

      if (!emailIdentityExists) {
        setSuccessMessage(
          "이미 가입 이력이 있는 이메일일 수 있어. 메일함을 다시 확인하거나 바로 로그인해봐."
        );
        return;
      }

      setSuccessMessage(
        `회원가입이 완료됐어. ${email.trim()} 로 인증 메일을 보냈으니 메일함에서 인증 링크를 눌러줘. 메일이 안 보이면 스팸함도 꼭 확인해줘.`
      );

      setLoginId("");
      setDisplayName("");
      setGuildName("");
      setEmail("");
      setPassword("");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "회원가입 중 오류가 발생했어."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell
      title="회원가입"
      subtitle="계정을 만들고 길드 파티 시스템을 이용해봐."
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
      <PageCard title="회원가입">
        {errorMessage ? (
          <div className="mb-4 rounded-2xl bg-red-500/10 px-4 py-3 text-red-300">
            {errorMessage}
          </div>
        ) : null}

        {successMessage ? (
          <div className="mb-4 rounded-2xl bg-green-500/10 px-4 py-3 text-green-300">
            {successMessage}
          </div>
        ) : null}

        <form onSubmit={handleSignup} className="space-y-4">
          <input
            className="w-full rounded-xl border border-white/10 bg-black/30 p-3 text-white outline-none"
            value={loginId}
            onChange={(e) => setLoginId(e.target.value)}
            placeholder="회원가입 ID"
          />

          <input
            className="w-full rounded-xl border border-white/10 bg-black/30 p-3 text-white outline-none"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="표시 닉네임"
          />

          <input
            className="w-full rounded-xl border border-white/10 bg-black/30 p-3 text-white outline-none"
            value={guildName}
            onChange={(e) => setGuildName(e.target.value)}
            placeholder="길드명"
          />

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
            {loading ? "가입 처리 중..." : "회원가입"}
          </button>
        </form>

        <button
          onClick={() => router.push("/login")}
          className="mt-4 cursor-pointer rounded-xl border border-white/15 bg-white/10 px-4 py-2 transition hover:bg-white/20"
        >
          로그인으로 이동
        </button>
      </PageCard>
    </AppShell>
  );
}