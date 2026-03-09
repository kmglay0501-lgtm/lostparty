"use client";

import { ReactNode } from "react";
import { useRouter } from "next/navigation";

type AppShellProps = {
  title?: string;
  subtitle?: string;
  rightSlot?: ReactNode;
  children: ReactNode;
};

export default function AppShell({
  title,
  subtitle,
  rightSlot,
  children,
}: AppShellProps) {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-[#09090d] text-white">
      <div className="mx-auto max-w-7xl p-5 md:p-8 space-y-6">
        <header className="grid grid-cols-1 gap-4 xl:grid-cols-[1.1fr_1fr]">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
            <button
              onClick={() => router.push("/")}
              className="cursor-pointer text-left"
            >
              <div
                className="text-4xl font-black tracking-tight md:text-5xl"
                style={{
                  textShadow:
                    "0 2px 0 rgba(255,255,255,0.08), 0 8px 24px rgba(0,0,0,0.45)",
                }}
              >
                <span className="text-white">LOST</span>{" "}
                <span className="bg-gradient-to-r from-rose-400 via-fuchsia-400 to-violet-400 bg-clip-text text-transparent">
                  PARTY
                </span>
              </div>
            </button>

            {title ? (
              <div className="mt-5">
                <h1 className="text-2xl font-bold text-white">{title}</h1>
                {subtitle ? (
                  <p className="mt-2 text-sm text-gray-400">{subtitle}</p>
                ) : null}
              </div>
            ) : (
              <p className="mt-3 text-sm text-gray-400">
                로스트아크 길드 파티 모집과 자동 파티 편성을 한눈에 보는 대시보드
              </p>
            )}
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
            {rightSlot}
          </div>
        </header>

        {children}
      </div>
    </main>
  );
}

export function PageCard({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}