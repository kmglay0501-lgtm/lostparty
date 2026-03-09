"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function OwnerAnnouncementPanel() {
  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [message, setMessage] = useState("");
  const [debugText, setDebugText] = useState("");

  useEffect(() => {
    void init();
  }, []);

  async function init() {
    setLoading(true);
    setMessage("");

    const { data: ownerData, error: ownerError } = await supabase.rpc("is_owner_user");

    if (ownerError) {
      setDebugText(`is_owner_user 오류: ${ownerError.message}`);
      setIsOwner(false);
      setLoading(false);
      return;
    }

    setIsOwner(!!ownerData);

    const { data: debugData, error: debugError } = await supabase.rpc("debug_owner_status");

    if (debugError) {
      setDebugText(`debug_owner_status 오류: ${debugError.message}`);
    } else if (Array.isArray(debugData) && debugData.length > 0) {
      const row = debugData[0] as {
        my_user_id?: string | null;
        my_login_id?: string | null;
        owner_login_id?: string | null;
        is_owner?: boolean;
      };

      setDebugText(
        `내 login_id=${row.my_login_id ?? "null"} / owner_login_id=${
          row.owner_login_id ?? "null"
        } / is_owner=${String(row.is_owner)}`
      );
    }

    setLoading(false);
  }

  async function saveAnnouncement() {
    setMessage("");

    const res = await fetch("/api/admin/announcement", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ title, body }),
    });

    const result = await res.json();

    if (!res.ok || !result.ok) {
      setMessage(result.error ?? "공지 저장 실패");
      return;
    }

    setMessage(result.message ?? "공지 저장 완료");
    setTitle("");
    setBody("");
  }

  if (loading) {
    return (
      <section className="rounded-3xl border border-white/10 bg-white/5 p-6 space-y-3">
        <h2 className="text-xl font-semibold text-white">오너 공지 관리</h2>
        <div className="text-sm text-gray-400">오너 권한 확인 중...</div>
      </section>
    );
  }

  if (!isOwner) {
    return (
      <section className="rounded-3xl border border-white/10 bg-white/5 p-6 space-y-3">
        <h2 className="text-xl font-semibold text-white">오너 공지 관리</h2>
        <div className="text-sm text-red-300">
          현재 계정은 오너로 판정되지 않았어.
        </div>
        <div className="text-xs text-gray-400 whitespace-pre-wrap">{debugText}</div>
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-6 space-y-4">
      <h2 className="text-xl font-semibold text-white">오너 공지 관리</h2>

      {message ? (
        <div className="rounded-2xl bg-white/10 px-4 py-3 text-sm text-gray-200">
          {message}
        </div>
      ) : null}

      <div className="text-xs text-gray-400 whitespace-pre-wrap">{debugText}</div>

      <input
        className="w-full rounded-xl border border-white/10 bg-black/30 p-3 text-white outline-none"
        placeholder="공지 제목"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />

      <textarea
        className="min-h-[140px] w-full rounded-xl border border-white/10 bg-black/30 p-3 text-white outline-none"
        placeholder="공지 내용"
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />

      <button
        onClick={saveAnnouncement}
        className="cursor-pointer rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-white transition hover:bg-white/20"
      >
        공지 저장
      </button>
    </section>
  );
}