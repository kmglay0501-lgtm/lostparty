"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

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
      console.error("[signup] error:", error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "회원가입 중 오류가 발생했어."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-xl p-6">
      <div className="rounded-2xl border p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">회원가입</h1>
          <button onClick={() => router.push("/")} className="border px-4 py-2">
            메인으로
          </button>
        </div>

        {errorMessage ? (
          <div className="rounded-xl bg-red-50 px-4 py-3 text-red-600">
            {errorMessage}
          </div>
        ) : null}

        {successMessage ? (
          <div className="rounded-xl bg-green-50 px-4 py-3 text-green-700">
            {successMessage}
          </div>
        ) : null}

        <form onSubmit={handleSignup} className="space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium">회원가입 ID</label>
            <input
              className="w-full border p-2"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              placeholder="로그인에 사용할 ID"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium">표시 닉네임</label>
            <input
              className="w-full border p-2"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="사이트에서 보여줄 닉네임"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium">길드명</label>
            <input
              className="w-full border p-2"
              value={guildName}
              onChange={(e) => setGuildName(e.target.value)}
              placeholder="선택 입력"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium">이메일</label>
            <input
              className="w-full border p-2"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@email.com"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium">비밀번호</label>
            <input
              className="w-full border p-2"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="border px-4 py-2 disabled:opacity-50"
          >
            {loading ? "가입 처리 중..." : "회원가입"}
          </button>
        </form>

        <div className="text-sm text-gray-500">
          이미 계정이 있으면 로그인 페이지로 이동해서 로그인해줘.
        </div>

        <button
          onClick={() => router.push("/login")}
          className="border px-4 py-2"
        >
          로그인으로 이동
        </button>
      </div>
    </main>
  );
}