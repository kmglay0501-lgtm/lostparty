"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AppShell, { PageCard } from "@/components/AppShell";
import SiteFooter from "@/components/SiteFooter";

type CharacterRow = {
  id: string;
  user_id: string;
  character_name: string | null;
  class_name: string | null;
  role: string | null;
  item_level: number | null;
  combat_power: number | null;
  profile_image_url: string | null;
  planned_gold_raids?: string[] | null;
  weekly_gold_raids?: string[] | null;
  weekly_gold_earned_count: number;
  is_gold_earner: boolean;
};

type BuddyCharacterRow = {
  id: string;
  user_id: string;
  character_name: string | null;
  class_name: string | null;
  role: string | null;
  item_level: number | null;
  combat_power: number | null;
  profile_image_url: string | null;
  planned_gold_raids?: string[] | null;
  weekly_gold_raids?: string[] | null;
  effective_planned_raid?: string | null;
  weekly_gold_earned_count: number;
  is_gold_earner: boolean;
};

function formatDecimal(value: number | null | undefined) {
  if (value === null || value === undefined) return "-";
  return new Intl.NumberFormat("ko-KR", {
    maximumFractionDigits: 2,
  }).format(value);
}

function getRemainingRaids(
  plannedGoldRaids: string[] | null | undefined,
  weeklyGoldRaids: string[] | null | undefined
) {
  const planned = plannedGoldRaids ?? [];
  const cleared = weeklyGoldRaids ?? [];
  return planned.filter((raid) => !cleared.includes(raid));
}

export default function BuddyRaidsPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [myCharacters, setMyCharacters] = useState<CharacterRow[]>([]);
  const [buddyCharacters, setBuddyCharacters] = useState<BuddyCharacterRow[]>([]);
  const [message, setMessage] = useState("");

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

    const [myCharRes, buddyCharRes] = await Promise.all([
      supabase
        .from("characters")
        .select(
          "id, user_id, character_name, class_name, role, item_level, combat_power, profile_image_url, planned_gold_raids, weekly_gold_raids, weekly_gold_earned_count, is_gold_earner"
        )
        .eq("user_id", user.id)
        .eq("is_registered", true)
        .eq("is_gold_earner", true)
        .order("item_level", { ascending: false, nullsFirst: false }),
      supabase
        .from("v_buddy_characters")
        .select(
          "id, user_id, character_name, class_name, role, item_level, combat_power, profile_image_url, planned_gold_raids, weekly_gold_raids, effective_planned_raid, weekly_gold_earned_count, is_gold_earner"
        )
        .eq("is_gold_earner", true)
        .order("item_level", { ascending: false, nullsFirst: false }),
    ]);

    setMyCharacters((myCharRes.data as CharacterRow[]) ?? []);
    setBuddyCharacters((buddyCharRes.data as BuddyCharacterRow[]) ?? []);
    setLoading(false);
  }

  async function createBuddyAutoParty() {
    setMessage("");

    const res = await fetch("/api/buddy/auto-party", {
      method: "POST",
    });

    const result = await res.json();

    if (!res.ok || !result.ok) {
      setMessage(result.error ?? "깐부 자동 파티 생성 실패");
      return;
    }

    setMessage(
      `${result.message ?? "깐부 자동 파티 생성 완료"} (${result.createdCount ?? result.created ?? 0}개)`
    );
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
      title="깐부 레이드"
      subtitle="개인이 설정한 골드 레이드 3개 기준으로 남은 레이드 확인"
      rightSlot={
        <div className="flex h-full items-start justify-end gap-2">
          <button
            onClick={() => router.push("/")}
            className="cursor-pointer rounded-xl border border-white/15 bg-white/10 px-4 py-2 transition hover:bg-white/20"
          >
            메인으로
          </button>
          <button
            onClick={() => router.push("/mypage")}
            className="cursor-pointer rounded-xl border border-white/15 bg-white/10 px-4 py-2 transition hover:bg-white/20"
          >
            마이페이지
          </button>
        </div>
      }
    >
      {message ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-gray-100">
          {message}
        </div>
      ) : null}

      <PageCard
        title="빠른 액션"
        action={
          <button
            onClick={createBuddyAutoParty}
            className="cursor-pointer rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-sm transition hover:bg-white/20"
          >
            깐부 자동 파티 생성
          </button>
        }
      >
        <div className="text-sm text-gray-400">
          이제 깐부 자동 파티는 아이템 레벨 추천 레이드가 아니라,
          각 캐릭터가 직접 선택한 골드 레이드 3개 기준으로 생성돼.
        </div>
      </PageCard>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <PageCard title={`내 골드 캐릭터 (${myCharacters.length})`}>
          {myCharacters.length === 0 ? (
            <div className="text-sm text-gray-400">
              등록된 골드 캐릭터가 아직 없어.
            </div>
          ) : (
            <div className="space-y-3">
              {myCharacters.map((character) => {
                const remainingRaids = getRemainingRaids(
                  character.planned_gold_raids,
                  character.weekly_gold_raids
                );

                return (
                  <div
                    key={character.id}
                    className="rounded-2xl border border-white/10 bg-black/20 p-4"
                  >
                    <div className="flex gap-4">
                      {character.profile_image_url ? (
                        <img
                          src={character.profile_image_url}
                          alt={character.character_name ?? "character"}
                          className="h-20 w-20 rounded-xl object-cover"
                        />
                      ) : null}

                      <div className="min-w-0 flex-1">
                        <div className="font-semibold">
                          {character.character_name ?? "-"}
                        </div>
                        <div className="text-sm text-gray-400">
                          {character.class_name ?? "-"} /{" "}
                          {character.role === "support" ? "💚 서포터" : "딜러"}
                        </div>
                        <div className="text-sm text-gray-400">
                          아이템 레벨: {formatDecimal(character.item_level)}
                        </div>
                        <div className="text-sm text-gray-400">
                          전투력: {formatDecimal(character.combat_power)}
                        </div>
                        <div className="text-sm text-gray-400">
                          골드 획득: {character.weekly_gold_earned_count}/3
                        </div>

                        <div className="mt-2 text-sm text-gray-300">
                          선택한 레이드:{" "}
                          {(character.planned_gold_raids ?? []).length > 0
                            ? (character.planned_gold_raids ?? []).join(", ")
                            : "-"}
                        </div>

                        <div className="mt-1 text-sm text-fuchsia-200">
                          남은 레이드:{" "}
                          {remainingRaids.length > 0 ? remainingRaids.join(", ") : "-"}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </PageCard>

        <PageCard title={`깐부 골드 캐릭터 (${buddyCharacters.length})`}>
          {buddyCharacters.length === 0 ? (
            <div className="text-sm text-gray-400">
              깐부 골드 캐릭터가 아직 없어.
            </div>
          ) : (
            <div className="space-y-3">
              {buddyCharacters.map((character) => {
                const remainingRaids = getRemainingRaids(
                  character.planned_gold_raids,
                  character.weekly_gold_raids
                );

                return (
                  <div
                    key={character.id}
                    className="rounded-2xl border border-white/10 bg-black/20 p-4"
                  >
                    <div className="flex gap-4">
                      {character.profile_image_url ? (
                        <img
                          src={character.profile_image_url}
                          alt={character.character_name ?? "buddy character"}
                          className="h-20 w-20 rounded-xl object-cover"
                        />
                      ) : null}

                      <div className="min-w-0 flex-1">
                        <div className="font-semibold">
                          {character.character_name ?? "-"}
                        </div>
                        <div className="text-sm text-gray-400">
                          {character.class_name ?? "-"} /{" "}
                          {character.role === "support" ? "💚 서포터" : "딜러"}
                        </div>
                        <div className="text-sm text-gray-400">
                          아이템 레벨: {formatDecimal(character.item_level)}
                        </div>
                        <div className="text-sm text-gray-400">
                          전투력: {formatDecimal(character.combat_power)}
                        </div>
                        <div className="text-sm text-gray-400">
                          골드 획득: {character.weekly_gold_earned_count}/3
                        </div>

                        <div className="mt-2 text-sm text-gray-300">
                          선택한 레이드:{" "}
                          {(character.planned_gold_raids ?? []).length > 0
                            ? (character.planned_gold_raids ?? []).join(", ")
                            : "-"}
                        </div>

                        <div className="mt-1 text-sm text-fuchsia-200">
                          남은 레이드:{" "}
                          {remainingRaids.length > 0 ? remainingRaids.join(", ") : "-"}
                        </div>

                        <div className="mt-1 text-sm text-gray-400">
                          최근 참여 레이드: {character.effective_planned_raid ?? "-"}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </PageCard>
      </section>

      <SiteFooter />
    </AppShell>
  );
}