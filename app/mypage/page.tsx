"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AppShell, { PageCard } from "@/components/AppShell";
import OwnerAnnouncementPanel from "@/components/OwnerAnnouncementPanel";
import { getKnownClassEngravingOptions } from "@/lib/lostark/synergy";

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
  role: string | null;
  gold_exhausted?: boolean | null;
  class_engraving?: string | null;
  synergy_labels?: string[] | null;
};

type BuddyRow = {
  buddy_user_id: string;
  login_id: string | null;
  display_name: string | null;
  guild_name: string | null;
  avatar_url: string | null;
  is_alt_account: boolean | null;
  created_at: string;
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
  const [characters, setCharacters] = useState<Character[]>([]);
  const [buddies, setBuddies] = useState<BuddyRow[]>([]);
  const [refreshingRegistered, setRefreshingRegistered] = useState(false);
  const [savingEngravingId, setSavingEngravingId] = useState<string | null>(null);

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

    await Promise.all([loadCharacters(user.id), loadBuddies()]);
    setLoading(false);
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
      setMessage(error.message || "등록 캐릭터 목록을 불러오지 못했어.");
      return;
    }

    setCharacters((data as Character[]) ?? []);
  }

  async function loadBuddies() {
    const { data, error } = await supabase
      .from("v_my_buddies")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(error.message || "깐부 목록을 불러오지 못했어.");
      return;
    }

    setBuddies((data as BuddyRow[]) ?? []);
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
    setMessage(result.message ?? "API Key 저장 완료");
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
        await loadCharacters(user.id);
      }

      setMessage(result.message ?? "등록 캐릭터 갱신 완료");
    } catch (error) {
      console.error("[refreshRegisteredCharacters] error:", error);
      setMessage("등록 캐릭터 갱신 중 오류가 발생했어.");
    } finally {
      setRefreshingRegistered(false);
    }
  }

  async function setCharacterEngraving(characterId: string, classEngraving: string) {
    setMessage("");
    setSavingEngravingId(characterId);

    try {
      const res = await fetch("/api/characters/set-engraving", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          characterId,
          classEngraving,
        }),
      });

      const result = await res.json();

      if (!res.ok || !result.ok) {
        setMessage(result.error ?? "직업각인 저장 실패");
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        await loadCharacters(user.id);
      }

      setMessage(result.message ?? "직업각인 저장 완료");
    } catch (error) {
      console.error("[setCharacterEngraving] error:", error);
      setMessage("직업각인 저장 중 오류가 발생했어.");
    } finally {
      setSavingEngravingId(null);
    }
  }

  async function removeBuddy(buddyUserId: string) {
    setMessage("");

    const res = await fetch("/api/buddy/remove", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ buddyUserId }),
    });

    const result = await res.json();

    if (!res.ok || !result.ok) {
      setMessage(result.error ?? "깐부 삭제 실패");
      return;
    }

    setMessage(result.message ?? "깐부 삭제 완료");
    await loadBuddies();
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#09090d] p-10 text-white">
        불러오는 중...
      </main>
    );
  }

  return (
    <AppShell
      title="마이페이지"
      subtitle="API Key 저장, 캐릭터 갱신, 직업각인 수동 설정"
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
      {message ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-gray-100">
          {message}
        </div>
      ) : null}

      <OwnerAnnouncementPanel />

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <PageCard title="로스트아크 API Key 저장">
          <div className="space-y-3">
            <input
              type="password"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/30 p-3 text-white outline-none"
              placeholder="bearer 포함 또는 제외 가능"
            />
            <button
              onClick={saveApiKey}
              className="cursor-pointer rounded-xl border border-white/15 bg-white/10 px-4 py-2 transition hover:bg-white/20"
            >
              저장
            </button>
          </div>
        </PageCard>

        <PageCard title="등록 캐릭터 정보 갱신">
          <div className="space-y-3">
            <div className="text-sm text-gray-400">
              직업 / 서버 / 아이템 레벨 / 전투력만 갱신하고,
              직업각인은 아래에서 직접 선택해.
            </div>
            <button
              onClick={refreshRegisteredCharacters}
              disabled={refreshingRegistered}
              className="cursor-pointer rounded-xl border border-white/15 bg-white/10 px-4 py-2 transition hover:bg-white/20 disabled:opacity-50"
            >
              {refreshingRegistered ? "갱신 중..." : "등록 캐릭터 정보 갱신"}
            </button>
          </div>
        </PageCard>
      </section>

      <PageCard title="깐부 관리">
        {buddies.length === 0 ? (
          <div className="text-sm text-gray-400">등록된 깐부가 아직 없어.</div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {buddies.map((buddy) => (
              <div
                key={buddy.buddy_user_id}
                className="rounded-2xl border border-white/10 bg-black/20 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold">
                      {buddy.display_name ?? buddy.login_id ?? "-"}
                    </div>
                    <div className="mt-1 text-sm text-gray-400">
                      ID: {buddy.login_id ?? "-"}
                    </div>
                    <div className="text-sm text-gray-400">
                      길드: {buddy.guild_name ?? "-"}
                    </div>
                  </div>

                  <button
                    onClick={() => removeBuddy(buddy.buddy_user_id)}
                    className="cursor-pointer rounded-xl border border-white/15 bg-white/10 px-3 py-1 text-sm transition hover:bg-white/20"
                  >
                    삭제
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </PageCard>

      <PageCard title={`등록된 캐릭터 (${characters.length})`}>
        {characters.length === 0 ? (
          <div className="text-sm text-gray-400">등록된 캐릭터가 아직 없어.</div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {characters.map((c) => {
              const options = getKnownClassEngravingOptions(c.class_name);

              return (
                <div
                  key={c.id}
                  className={`rounded-2xl border border-white/10 bg-black/20 p-4 ${
                    c.gold_exhausted ? "opacity-50" : ""
                  }`}
                >
                  <div className="font-semibold">{c.character_name ?? "-"}</div>
                  <div className="text-sm text-gray-400">{c.class_name ?? "-"}</div>
                  <div className="text-sm text-gray-400">
                    서버: {c.server_name ?? "-"}
                  </div>
                  <div className="text-sm text-gray-400">
                    전투력: {formatDecimal(c.combat_power)}
                  </div>
                  <div className="text-sm text-gray-400">
                    아이템 레벨: {formatDecimal(c.item_level)}
                  </div>
                  <div className="text-sm text-gray-400">
                    역할: {c.role === "support" ? "💚 서포터" : "딜러"}
                  </div>

                  <div className="mt-4 text-sm font-medium text-white">
                    직업각인 설정
                  </div>

                  {options.length === 0 ? (
                    <div className="mt-2 text-sm text-red-300">
                      이 직업은 아직 직업각인 목록이 없거나 직업명이 비어 있어.
                    </div>
                  ) : (
                    <select
                      className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 p-3 text-white outline-none"
                      value={c.class_engraving ?? ""}
                      onChange={(e) => setCharacterEngraving(c.id, e.target.value)}
                      disabled={savingEngravingId === c.id}
                    >
                      <option value="">직업각인을 선택해줘</option>
                      {options.map((option) => (
                        <option key={`${c.id}-${option.value}`} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  )}

                  <div className="mt-3 rounded-xl bg-white/5 px-3 py-2 text-sm">
                    <div className="text-gray-400">현재 직업각인</div>
                    <div>{c.class_engraving ?? "-"}</div>
                  </div>

                  <div className="mt-2 rounded-xl bg-white/5 px-3 py-2 text-sm">
                    <div className="text-gray-400">시너지</div>
                    <div>
                      {c.synergy_labels && c.synergy_labels.length > 0
                        ? c.synergy_labels.join(" / ")
                        : "-"}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </PageCard>
    </AppShell>
  );
}