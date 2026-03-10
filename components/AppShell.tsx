"use client";

import { ReactNode } from "react";
import { useRouter } from "next/navigation";

type AppShellProps = {
  title?: string;
  subtitle?: string;
  rightSlot?: ReactNode;
  announcementTitle?: string | null;
  announcementBody?: string | null;
  children: ReactNode;
};

export default function AppShell({
  title,
  subtitle,
  rightSlot,
  announcementTitle,
  announcementBody,
  children,
}: AppShellProps) {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-[#09090d] text-white">
      <div className="mx-auto max-w-7xl p-4 md:p-6 space-y-5">
        <header className="grid grid-cols-1 gap-4 xl:grid-cols-[1.45fr_0.95fr]">
          <section className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
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

            <div className="mt-3">
              {title ? (
                <>
                  <h1 className="text-2xl font-bold text-white">{title}</h1>
                  {subtitle ? (
                    <p className="mt-1 text-sm text-gray-400">{subtitle}</p>
                  ) : null}
                </>
              ) : (
                <>
                  <p className="text-sm text-gray-400">
                    로스트아크 길드 파티 모집과 자동 파티 편성을 한눈에 보는 대시보드
                  </p>

                  {announcementTitle || announcementBody ? (
                    <div className="mt-4 rounded-2xl border border-fuchsia-400/20 bg-fuchsia-500/10 p-4">
                      <div className="text-xs uppercase tracking-[0.2em] text-fuchsia-300">
                        Announcement
                      </div>
                      {announcementTitle ? (
                        <div className="mt-2 text-xl font-semibold">
                          {announcementTitle}
                        </div>
                      ) : null}
                      {announcementBody ? (
                        <div className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-200">
                          {announcementBody}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </>
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
            <div className="flex h-full flex-col justify-between gap-5">
              <div className="flex justify-end gap-2">{rightSlot}</div>

              <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-5 text-center">
                <div className="text-sm text-gray-400">현재 진행 주차</div>
                <div className="mt-2 text-3xl font-bold text-white">
                  {getCurrentWeekLabel()}
                </div>
              </div>

              {!title ? (
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="text-sm font-semibold text-white">이용안내</div>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    {[
                      "회원가입",
                      "이메일 인증",
                      "마이페이지 API 등록",
                      "캐릭터 등록",
                    ].map((step, index) => (
                      <div
                        key={step}
                        className="flex items-center gap-3 rounded-2xl bg-white/5 px-3 py-3"
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-fuchsia-500 to-violet-500 text-sm font-bold text-white">
                          {index + 1}
                        </div>
                        <div className="text-sm text-gray-200">{step}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </section>
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

function getCurrentWeekLabel() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const diff = now.getTime() - start.getTime();
  const day = Math.floor(diff / (1000 * 60 * 60 * 24));
  const week = Math.ceil((day + start.getDay() + 1) / 7);
  return `${now.getFullYear()}년 ${week}주차`;
}