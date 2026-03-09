"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type ImportCandidate = {
  id: string;
  character_name: string | null;
  class_name: string | null;
  server_name: string | null;
  item_level: number | null;
  combat_power: number | null;
  profile_image_url: string | null;
};

type Character = {
  id: string;
  character_name: string | null;
  class_name: string | null;
  server_name: string | null;
  item_level: number | null;
  combat_power: number | null;
  is_gold_earner: boolean;
  planned_gold_raid: string | null;
  weekly_gold_earned_count: number;
  weekly_cleared_raid_bases: string[];
};

function formatDecimal(value: number | null | undefined) {
  if (value === null || value === undefined) return "-";
  return new Intl.NumberFormat("ko-KR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

export default function MyPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [candidates, setCandidates] = useState<ImportCandidate[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [refreshingRegistered, setRefreshingRegistered] = useState(false);

  useEffect(() => {
    void init();
  }, []);

  async function init() {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.replace("/login");
      return;
    }

    await Promise.all([loadCandidates(user.id), loadCharacters(user.id)]);
    setLoading(false);
  }

  async function loadCandidates(userId: string) {
    const { data, error } = await supabase
      .from("character_import_candidates")
      .select("*")
      .eq("user_id", userId)
      .order("combat_power", { ascending: false, nullsFirst: false })
      .order("item_level", { ascending: false, nullsFirst: false });

    if (error) {
      console.error("[loadCandidates] error:", error);
      setMessage(error.message || "후보 캐릭터 목록을 불러오지 못했어.");
      return;
    }

    setCandidates((data as ImportCandidate[]) ?? []);
  }

  async function loadCharacters(userId: string) {
    const { data, error } = await supabase
      .from("characters")
      .select("*")
      .eq("user_id", userId)
      .eq("is_registered", true)
      .order("combat_power", { ascending: false, nullsFirst: false })
      .order("item_level", { ascending: false, nullsFirst: false });

    if (error) {
      console.error("[loadCharacters] error:", error);
      setMessage(error.message || "등록 캐릭터 목록을 불러오지 못했어.");
      return;
    }

    setCharacters((data as Character[]) ?? []);
  }

  async function saveApiKey() {
    setMessage("");

    const res = await fetch("/api/account/api-key", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ apiKey: apiKeyInput.trim() }),
    });

    const result = await res.json();

    if (!res.ok || !result.ok) {
      setMessage(result.error ?? "API Key 저장 실패");
      return;
    }

    setApiKeyInput("");
    setMessage("API Key 저장 완료");
  }

  async function registerSelectedCharacters() {
    setMessage("");

    if (selectedIds.length === 0) {
      setMessage("등록할 캐릭터를 선택해줘.");
      return;
    }

    try {
      const res = await fetch("/api/characters/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          candidateIds: selectedIds,
        }),
      });

      const result = await res.json();

      if (!res.ok || !result.ok) {
        setMessage(result.error ?? "캐릭터 등록 실패");
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        await Promise.all([loadCandidates(user.id), loadCharacters(user.id)]);
      }

      setSelectedIds([]);
      setMessage(result.message ?? "선택 캐릭터 등록 완료");
    } catch (error) {
      console.error("[registerSelectedCharacters] error:", error);
      setMessage("캐릭터 등록 중 오류가 발생했어.");
    }
  }

  async function refreshRegisteredCharacters() {
    setMessage("");
    setRefreshingRegistered(true);

    try {
      const res = await fetch("/api/lostark/character", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mode: "refresh-registered",
        }),
      });

      const result = await res.json();

      if (!res.ok || !result.ok) {
        setMessage(result.error ?? "등록 캐릭터 갱신 실패");
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        await Promise.all([loadCandidates(user.id), loadCharacters(user.id)]);
      }

      setMessage(result.message ?? "등록 캐릭터 갱신 완료");
    } catch (error) {
      console.error("[refreshRegisteredCharacters] error:", error);
      setMessage("등록 캐릭터 갱신 중 오류가 발생했어.");
    } finally {
      setRefreshingRegistered(false);
    }
  }

  async function deleteCharacter(characterId: string) {
    const { error } = await supabase
      .from("characters")
      .delete()
      .eq("id", characterId);

    if (error) {
      setMessage(error.message || "캐릭터 삭제 실패");
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      await loadCharacters(user.id);
    }

    setMessage("캐릭터 삭제 완료");
  }

  if (loading) {
    return <main className="p-10">불러오는 중...</main>;
  }

  return (
    <main className="mx-auto max-w-7xl p-6 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">마이페이지</h1>
        <button onClick={() => router.push("/")} className="border px-4 py-2">
          메인으로
        </button>
      </div>

      {message ? (
        <div className="rounded-xl bg-gray-100 px-4 py-3">{message}</div>
      ) : null}

      <section className="rounded-2xl border p-6 space-y-4">
        <h2 className="text-xl font-semibold">API Key 저장</h2>
        <input
          type="password"
          value={apiKeyInput}
          onChange={(e) => setApiKeyInput(e.target.value)}
          className="w-full border p-2"
          placeholder="bearer 포함 또는 제외 가능"
        />
        <button onClick={saveApiKey} className="border px-4 py-2">
          저장
        </button>
      </section>

      <section className="rounded-2xl border p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            불러온 캐릭터 후보 ({candidates.length})
          </h2>
          <button onClick={init} className="border px-4 py-2">
            새로고침
          </button>
        </div>

        {candidates.length === 0 ? (
          <div className="text-sm text-gray-500">
            아직 불러온 후보 캐릭터가 없어. 메인 페이지에서 대표 캐릭터명으로 원정대 후보를 먼저 동기화해줘.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {candidates.map((c) => {
              const checked = selectedIds.includes(c.id);

              return (
                <label
                  key={c.id}
                  className="border p-4 rounded-xl block cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                      setSelectedIds((prev) =>
                        e.target.checked
                          ? [...prev, c.id]
                          : prev.filter((id) => id !== c.id)
                      );
                    }}
                  />
                  {c.profile_image_url ? (
                    <img
                      src={c.profile_image_url}
                      width={80}
                      height={80}
                      alt={c.character_name ?? "candidate"}
                      className="mt-2"
                    />
                  ) : null}
                  <div className="mt-2 font-semibold">{c.character_name}</div>
                  <div>{c.class_name}</div>
                  <div>전투력: {formatDecimal(c.combat_power)}</div>
                  <div>아이템 레벨: {formatDecimal(c.item_level)}</div>
                </label>
              );
            })}
          </div>
        )}

        <button onClick={registerSelectedCharacters} className="border px-4 py-2">
          선택 캐릭터 등록
        </button>
      </section>

      <section className="rounded-2xl border p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">등록된 캐릭터 ({characters.length})</h2>
          <button
            onClick={refreshRegisteredCharacters}
            disabled={refreshingRegistered}
            className="border px-4 py-2 disabled:opacity-50"
          >
            {refreshingRegistered ? "갱신 중..." : "등록 캐릭터 정보 갱신"}
          </button>
        </div>

        {characters.length === 0 ? (
          <div className="text-sm text-gray-500">등록된 캐릭터가 아직 없어.</div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {characters.map((c) => (
              <div key={c.id} className="border p-4 rounded-xl">
                <div className="font-semibold">{c.character_name}</div>
                <div>{c.class_name}</div>
                <div>전투력: {formatDecimal(c.combat_power)}</div>
                <div>아이템 레벨: {formatDecimal(c.item_level)}</div>
                <div>주간 골드 획득: {c.weekly_gold_earned_count}/3</div>

                <button
                  onClick={() => deleteCharacter(c.id)}
                  className="mt-2 border px-3 py-1"
                >
                  삭제
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}