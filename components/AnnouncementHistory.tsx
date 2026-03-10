"use client";

import { useEffect, useState } from "react";
import { PageCard } from "@/components/AppShell";

type AnnouncementRow = {
  id: string;
  title: string;
  body: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type AnnouncementHistoryResponse = {
  ok: boolean;
  isOwner: boolean;
  rows: AnnouncementRow[];
  error?: string;
};

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("ko-KR");
}

export default function AnnouncementHistory() {
  const [rows, setRows] = useState<AnnouncementRow[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    void loadHistory();
  }, []);

  async function loadHistory() {
    setLoading(true);
    setMessage("");

    try {
      const res = await fetch("/api/announcements/history", {
        method: "GET",
        cache: "no-store",
      });

      const result = (await res.json()) as AnnouncementHistoryResponse;

      if (!res.ok || !result.ok) {
        setMessage(result.error ?? "공지사항 기록을 불러오지 못했어.");
        setRows([]);
        setIsOwner(false);
        return;
      }

      setRows(result.rows ?? []);
      setIsOwner(!!result.isOwner);
    } catch (error) {
      console.error("[AnnouncementHistory] load error:", error);
      setMessage("공지사항 기록을 불러오는 중 오류가 발생했어.");
      setRows([]);
      setIsOwner(false);
    } finally {
      setLoading(false);
    }
  }

  async function deleteAnnouncement(id: string) {
    setWorkingId(id);
    setMessage("");

    try {
      const res = await fetch("/api/announcements/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ announcementId: id }),
      });

      const result = await res.json();

      if (!res.ok || !result.ok) {
        setMessage(result.error ?? "공지사항 삭제 실패");
        return;
      }

      setMessage(result.message ?? "공지사항 삭제 완료");
      await loadHistory();
    } catch (error) {
      console.error("[AnnouncementHistory] delete error:", error);
      setMessage("공지사항 삭제 중 오류가 발생했어.");
    } finally {
      setWorkingId(null);
    }
  }

  return (
    <PageCard title="공지사항 기록">
      {message ? (
        <div className="mb-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-gray-100">
          {message}
        </div>
      ) : null}

      {loading ? (
        <div className="text-sm text-gray-400">불러오는 중...</div>
      ) : rows.length === 0 ? (
        <div className="text-sm text-gray-400">공지사항 기록이 아직 없어.</div>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <div
              key={row.id}
              className="rounded-2xl border border-white/10 bg-black/20 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="text-lg font-semibold text-white">
                      {row.title}
                    </div>
                    {row.is_active ? (
                      <span className="rounded-full border border-fuchsia-400/20 bg-fuchsia-500/10 px-2 py-0.5 text-xs text-fuchsia-300">
                        활성
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-300">
                    {row.body}
                  </div>

                  <div className="mt-3 text-xs text-gray-500">
                    작성: {formatDate(row.created_at)} / 수정: {formatDate(row.updated_at)}
                  </div>
                </div>

                {isOwner ? (
                  <button
                    onClick={() => deleteAnnouncement(row.id)}
                    disabled={workingId === row.id}
                    className="cursor-pointer rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-1 text-sm text-red-200 transition hover:bg-red-500/20 disabled:opacity-50"
                  >
                    {workingId === row.id ? "삭제 중..." : "삭제"}
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </PageCard>
  );
}