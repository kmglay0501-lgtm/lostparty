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
  planned_gold_raid: string | null;
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
  planned_gold_raid: string | null;
  effective_planned_raid?: string | null;
  weekly_gold_earned_count: number;
  is_gold_earner: boolean;
};

type AvailableRaidRow = {
  character_id: string;
  raid_name: string;
  difficulty: string | null;
  gold_raid: boolean;
};

function formatDecimal(value: number | null | undefined) {
  if (value === null || value === undefined) return "-";
  return new Intl.NumberFormat("ko-KR", {
    maximumFractionDigits: 2,
  }).format(value);
}

function formatRaidName(raidName: string, difficulty: string | null) {
  return difficulty ? `${raidName}/${difficulty}` : raidName;
}

export default function BuddyRaidsPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [myCharacters, setMyCharacters] = useState<CharacterRow[]>([]);
  const [buddyCharacters, setBuddyCharacters] = useState<BuddyCharacterRow[]>([]);
  const [availableRaids, setAvailableRaids] = useState<AvailableRaidRow[]>([]);
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
          "id, user_id, character_name, class_name, role, item_level, combat_power, profile_image_url, planned_gold_raid, weekly_gold_earned_count, is_gold_earner"
        )
        .eq("user_id", user.id)
        .eq("is_registered", true)
        .eq("is_gold_earner", true)
        .order("item_level", { ascending: false, nullsFirst: false }),
      supabase
        .from("v_buddy_characters")
        .select(
          "id, user_id, character_name, class_name, role, item_level, combat_power, profile_image_url, planned_gold_raid, effective_planned_raid, weekly_gold_earned_count, is_gold_earner"
        )
        .eq("is_gold_earner", true)
        .order("item_level", { ascending: false, nullsFirst: false }),
    ]);

    const nextMyCharacters = (myCharRes.data as CharacterRow[]) ?? [];
    const nextBuddyCharacters = (buddyCharRes.data as BuddyCharacterRow[]) ?? [];

    const allCharacterIds = [
      ...nextMyCharacters.map((row) => row.id),
      ...nextBuddyCharacters.map((row) => row.id),
    ];

    let nextAvailableRaids: AvailableRaidRow[] = [];

    if (allCharacterIds.length > 0) {
      const { data: availableRaidData } = await supabase
        .from("v_character_available_raids")
        .select("character_id, raid_name, difficulty, gold_raid")
        .in("character_id", allCharacterIds);

      nextAvailableRaids = (availableRaidData as AvailableRaidRow[]) ?? [];
    }

    setMyCharacters(nextMyCharacters);
    setBuddyCharacters(nextBuddyCharacters);
    setAvailableRaids(nextAvailableRaids);
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

  function getCharacterRaids(characterId: string) {
    return availableRaids
      .filter((row) => row.character_id === characterId)
      .map((row) => formatRaidName(row.raid_name, row.difficulty));
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
      subtitle="이번 주 남은 레이드와 깐부 골드 캐릭터 현황"
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
          골드 캐릭터 기준으로 이번 주 남은 레이드를 확인하고, 깐부와 겹치는 레이드를 기준으로 자동 파티를 생성할 수 있어.
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
              {myCharacters.map((character) => (
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
                        남은 레이드:{" "}
                        {getCharacterRaids(character.id).length > 0
                          ? getCharacterRaids(character.id).join(", ")
                          : "-"}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
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
              {buddyCharacters.map((character) => (
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
                        예정/참여 레이드:{" "}
                        {character.effective_planned_raid ??
                          character.planned_gold_raid ??
                          "-"}
                      </div>
                      <div className="mt-1 text-sm text-gray-300">
                        남은 레이드:{" "}
                        {getCharacterRaids(character.id).length > 0
                          ? getCharacterRaids(character.id).join(", ")
                          : "-"}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </PageCard>
      </section>

      <SiteFooter />
    </AppShell>
  );
}