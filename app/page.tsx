"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AppShell, { PageCard } from "@/components/AppShell";
import AnnouncementHistory from "@/components/AnnouncementHistory";
import SiteFooter from "@/components/SiteFooter";

type RaidPostRow = {
  id: string;
  raid_name: string;
  difficulty: string | null;
  raid_time: string | null;
  title: string | null;
  description: string | null;
  creator_id: string;
  max_members: number;
  current_members: number;
};

type CompletedPartyRow = {
  party_id: string;
  post_id: string;
  party_name: string | null;
  raid_name: string | null;
  difficulty: string | null;
  status: string;
  members: number;
};

type BuddyListRow = {
  buddy_user_id: string;
  login_id: string | null;
  display_name: string | null;
  guild_name: string | null;
  avatar_url: string | null;
  is_alt_account: boolean | null;
  created_at: string;
};

type BuddyRequestRow = {
  id: string;
  requester_id: string;
  receiver_id: string;
  status: string;
  created_at: string;
  updated_at: string;
  requester_login_id: string | null;
  requester_display_name: string | null;
  requester_guild_name: string | null;
  receiver_login_id: string | null;
  receiver_display_name: string | null;
  receiver_guild_name: string | null;
};

type BuddyCharacterRow = {
  id: string;
  user_id: string;
  character_name: string | null;
  server_name: string | null;
  class_name: string | null;
  role: string | null;
  item_level: number | null;
  combat_power: number | null;
  profile_image_url: string | null;
  is_gold_earner: boolean;
  planned_gold_raid: string | null;
  weekly_gold_earned_count: number;
  weekly_cleared_raid_bases: string[];
  gold_exhausted: boolean | null;
  is_registered: boolean;
  class_engraving?: string | null;
  synergy_labels?: string[] | null;
  effective_planned_raid?: string | null;
};

type ActiveAnnouncementRow = {
  id: string;
  title: string;
  body: string;
  created_at: string;
  updated_at: string;
};

type CharacterRankingSourceRow = {
  id: string;
  user_id: string;
  character_name: string | null;
  class_name: string | null;
  combat_power: number | null;
  item_level: number | null;
  is_registered: boolean;
};

type ProfileRankingSourceRow = {
  id: string;
  display_name: string | null;
};

type RankingItem = {
  userId: string;
  ownerName: string;
  characterName: string;
  className: string;
  combatPower: number;
  itemLevel: number;
};

type CurrentPartyPreviewRow = {
  post_id: string;
  raid_name: string | null;
  difficulty: string | null;
  raid_time: string | null;
  title: string | null;
  max_members: number;
  filled_members: number;
  members: Array<{
    party_id: string;
    party_number: number | null;
    slot_number: number | null;
    role: string | null;
    is_dummy: boolean;
    character_name: string | null;
    class_name: string | null;
    item_level: number | null;
    combat_power: number | null;
    class_engraving: string | null;
    synergy_labels: string[] | null;
    owner_name: string | null;
  }>;
};

function formatDecimal(value: number | null | undefined) {
  if (value === null || value === undefined) return "-";
  return new Intl.NumberFormat("ko-KR", {
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(value: string | null | undefined) {
  if (!value) return "미정";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("ko-KR");
}

function medalBadge(rank: number) {
  if (rank === 1) return "🥇 1";
  if (rank === 2) return "🥈 2";
  if (rank === 3) return "🥉 3";
  return `${rank}`;
}

function buildTopRanking(
  characters: CharacterRankingSourceRow[],
  profiles: ProfileRankingSourceRow[]
) {
  const profileMap = new Map<string, string>();

  for (const profile of profiles) {
    profileMap.set(profile.id, profile.display_name ?? "이름없음");
  }

  const bestByUser = new Map<string, RankingItem>();

  for (const row of characters) {
    if (!row.user_id) continue;

    const current: RankingItem = {
      userId: row.user_id,
      ownerName: profileMap.get(row.user_id) ?? "이름없음",
      characterName: row.character_name ?? "-",
      className: row.class_name ?? "-",
      combatPower: row.combat_power ?? 0,
      itemLevel: row.item_level ?? 0,
    };

    const prev = bestByUser.get(row.user_id);

    if (!prev) {
      bestByUser.set(row.user_id, current);
      continue;
    }

    if (current.itemLevel > prev.itemLevel) {
      bestByUser.set(row.user_id, current);
      continue;
    }

    if (
      current.itemLevel === prev.itemLevel &&
      current.combatPower > prev.combatPower
    ) {
      bestByUser.set(row.user_id, current);
    }
  }

  return Array.from(bestByUser.values()).sort((a, b) => {
    if (b.combatPower !== a.combatPower) return b.combatPower - a.combatPower;
    return b.itemLevel - a.itemLevel;
  });
}

export default function HomePage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [raidPosts, setRaidPosts] = useState<RaidPostRow[]>([]);
  const [completedParties, setCompletedParties] = useState<CompletedPartyRow[]>([]);
  const [buddies, setBuddies] = useState<BuddyListRow[]>([]);
  const [buddyRequests, setBuddyRequests] = useState<BuddyRequestRow[]>([]);
  const [buddyCharacters, setBuddyCharacters] = useState<BuddyCharacterRow[]>([]);
  const [announcement, setAnnouncement] = useState<ActiveAnnouncementRow | null>(
    null
  );
  const [ranking, setRanking] = useState<RankingItem[]>([]);
  const [showFullRanking, setShowFullRanking] = useState(false);
  const [showAllBuddyGold, setShowAllBuddyGold] = useState(false);
  const [currentPartyPreviews, setCurrentPartyPreviews] = useState<
    CurrentPartyPreviewRow[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [buddyInput, setBuddyInput] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    void init();
  }, []);

  async function init() {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    setUser(user ?? null);

    const [
      postRes,
      partyRes,
      buddyRes,
      requestRes,
      buddyCharRes,
      announcementRes,
      characterRankingRes,
      profileRankingRes,
      partyPreviewRes,
    ] = await Promise.all([
      supabase
        .from("v_active_raid_posts")
        .select("*")
        .order("raid_time", { ascending: true, nullsFirst: false }),
      supabase
        .from("v_completed_parties")
        .select("*")
        .order("members", { ascending: false }),
      user
        ? supabase
            .from("v_my_buddies")
            .select("*")
            .order("created_at", { ascending: false })
        : Promise.resolve({ data: [] as any[] }),
      user
        ? supabase
            .from("v_my_buddy_requests")
            .select("*")
            .order("created_at", { ascending: false })
        : Promise.resolve({ data: [] as any[] }),
      user
        ? supabase
            .from("v_buddy_characters")
            .select("*")
            .eq("is_gold_earner", true)
        : Promise.resolve({ data: [] as any[] }),
      supabase.from("v_active_announcement").select("*").maybeSingle(),
      supabase
        .from("characters")
        .select(
          "id, user_id, character_name, class_name, combat_power, item_level, is_registered"
        )
        .eq("is_registered", true),
      supabase.from("profiles").select("id, display_name"),
      supabase
        .from("v_current_party_previews")
        .select("*")
        .order("raid_time", { ascending: true, nullsFirst: false }),
    ]);

    const characterRankingRows =
      (characterRankingRes.data as CharacterRankingSourceRow[]) ?? [];
    const profileRankingRows =
      (profileRankingRes.data as ProfileRankingSourceRow[]) ?? [];

    setRaidPosts((postRes.data as RaidPostRow[]) ?? []);
    setCompletedParties((partyRes.data as CompletedPartyRow[]) ?? []);
    setBuddies((buddyRes.data as BuddyListRow[]) ?? []);
    setBuddyRequests((requestRes.data as BuddyRequestRow[]) ?? []);
    setBuddyCharacters((buddyCharRes.data as BuddyCharacterRow[]) ?? []);
    setAnnouncement((announcementRes.data as ActiveAnnouncementRow | null) ?? null);
    setRanking(buildTopRanking(characterRankingRows, profileRankingRows));
    setCurrentPartyPreviews(
      (partyPreviewRes.data as CurrentPartyPreviewRow[]) ?? []
    );
    setLoading(false);
  }

  async function requestBuddy() {
    setMessage("");

    if (!buddyInput.trim()) {
      setMessage("회원가입 ID를 입력해줘.");
      return;
    }

    const res = await fetch("/api/buddy/request", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ loginId: buddyInput.trim() }),
    });

    const result = await res.json();

    if (!res.ok || !result.ok) {
      setMessage(result.error ?? "깐부 요청 실패");
      return;
    }

    setBuddyInput("");
    setMessage(result.message ?? "깐부 요청 전송 완료");
    await init();
  }

  async function respondBuddyRequest(
    requestId: string,
    action: "accept" | "reject"
  ) {
    setMessage("");

    const res = await fetch("/api/buddy/respond", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ requestId, action }),
    });

    const result = await res.json();

    if (!res.ok || !result.ok) {
      setMessage(result.error ?? "깐부 요청 처리 실패");
      return;
    }

    setMessage(result.message ?? "깐부 요청 처리 완료");
    await init();
  }

  async function cancelBuddyRequest(requestId: string) {
    setMessage("");

    const res = await fetch("/api/buddy/cancel-request", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ requestId }),
    });

    const result = await res.json();

    if (!res.ok || !result.ok) {
      setMessage(result.error ?? "깐부 요청 취소 실패");
      return;
    }

    setMessage(result.message ?? "깐부 요청 취소 완료");
    await init();
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
    await init();
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
    await init();
  }

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  const incomingRequests = buddyRequests.filter(
    (row) => user && row.receiver_id === user.id && row.status === "pending"
  );
  const outgoingRequests = buddyRequests.filter(
    (row) => user && row.requester_id === user.id && row.status === "pending"
  );

  const top10Ranking = ranking.slice(0, 10);
  const top10BuddyGold = buddyCharacters.slice(0, 10);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#09090d] p-10 text-white">
        불러오는 중...
      </main>
    );
  }

  return (
    <AppShell
      announcementTitle={announcement?.title ?? null}
      announcementBody={announcement?.body ?? null}
      rightSlot={
        <>
          {!user ? (
            <>
              <button
                onClick={() => router.push("/login")}
                className="cursor-pointer rounded-xl border border-white/15 bg-white/10 px-4 py-2 transition hover:bg-white/20"
              >
                로그인
              </button>
              <button
                onClick={() => router.push("/signup")}
                className="cursor-pointer rounded-xl border border-white/15 bg-white/10 px-4 py-2 transition hover:bg-white/20"
              >
                회원가입
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => router.push("/buddy-raids")}
                className="cursor-pointer rounded-xl border border-white/15 bg-white/10 px-4 py-2 transition hover:bg-white/20"
              >
                깐부 레이드
              </button>
              <button
                onClick={() => router.push("/mypage")}
                className="cursor-pointer rounded-xl border border-white/15 bg-white/10 px-4 py-2 transition hover:bg-white/20"
              >
                마이페이지
              </button>
              <button
                onClick={logout}
                className="cursor-pointer rounded-xl border border-white/15 bg-white/10 px-4 py-2 transition hover:bg-white/20"
              >
                로그아웃
              </button>
            </>
          )}
        </>
      }
    >
      {message ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-gray-100">
          {message}
        </div>
      ) : null}

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.3fr_0.9fr]">
        <PageCard
          title="진행중인 레이드"
          action={
            user ? (
              <button
                onClick={() => router.push("/mypage")}
                className="cursor-pointer rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-sm transition hover:bg-white/20"
              >
                모집 만들기
              </button>
            ) : null
          }
        >
          {raidPosts.length === 0 ? (
            <div className="text-sm text-gray-400">진행중인 모집이 아직 없어.</div>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {raidPosts.slice(0, 6).map((post) => {
                const recruitableSlots = Math.max((post.max_members ?? 0) - 1, 0);
                const visibleApplicants = Math.max(
                  (post.current_members ?? 0) - 1,
                  0
                );

                return (
                  <button
                    key={post.id}
                    onClick={() => router.push(`/raid/${post.id}`)}
                    className="cursor-pointer rounded-2xl border border-white/10 bg-black/20 p-4 text-left transition hover:bg-white/10"
                  >
                    <div className="font-semibold text-white">
                      {post.title ?? post.raid_name}
                    </div>
                    <div className="mt-1 text-sm text-gray-400">
                      {post.raid_name} / {post.difficulty ?? "-"}
                    </div>
                    <div className="mt-2 text-sm text-gray-400">
                      시간: {formatDate(post.raid_time)}
                    </div>
                    <div className="text-sm text-gray-400">
                      신청 인원: {visibleApplicants}/{recruitableSlots}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </PageCard>

        <div className="grid grid-cols-1 gap-4">
          <PageCard title="빠른 액션">
            <div className="grid grid-cols-1 gap-3">
              {user ? (
                <>
                  <button
                    onClick={() => router.push("/mypage")}
                    className="cursor-pointer rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-left transition hover:bg-white/10"
                  >
                    내 캐릭터 / 모집 관리
                  </button>
                  <button
                    onClick={() => router.push("/buddy-raids")}
                    className="cursor-pointer rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-left transition hover:bg-white/10"
                  >
                    깐부 레이드 페이지
                  </button>
                  <button
                    onClick={createBuddyAutoParty}
                    className="cursor-pointer rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-left transition hover:bg-white/10"
                  >
                    깐부 자동 파티 생성
                  </button>
                </>
              ) : (
                <div className="text-sm text-gray-400">
                  로그인하면 빠른 액션을 사용할 수 있어.
                </div>
              )}
            </div>
          </PageCard>

          <PageCard title="깐부 요청">
            {user ? (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input
                    className="flex-1 rounded-xl border border-white/10 bg-black/20 p-3 text-white outline-none"
                    placeholder="회원가입 ID로 깐부 요청"
                    value={buddyInput}
                    onChange={(e) => setBuddyInput(e.target.value)}
                  />
                  <button
                    onClick={requestBuddy}
                    className="cursor-pointer rounded-xl border border-white/15 bg-white/10 px-4 py-2 transition hover:bg-white/20"
                  >
                    요청
                  </button>
                </div>

                {incomingRequests.length > 0 ? (
                  <div className="space-y-2">
                    <div className="text-sm font-semibold text-white">
                      받은 요청
                    </div>
                    {incomingRequests.map((row) => (
                      <div
                        key={row.id}
                        className="rounded-xl border border-white/10 bg-white/5 p-3"
                      >
                        <div className="text-sm">
                          {row.requester_display_name ??
                            row.requester_login_id ??
                            "-"}
                        </div>
                        <div className="mt-2 flex gap-2">
                          <button
                            onClick={() => respondBuddyRequest(row.id, "accept")}
                            className="cursor-pointer rounded-xl border border-white/15 bg-white/10 px-3 py-1 text-sm transition hover:bg-white/20"
                          >
                            수락
                          </button>
                          <button
                            onClick={() => respondBuddyRequest(row.id, "reject")}
                            className="cursor-pointer rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-1 text-sm text-red-200 transition hover:bg-red-500/20"
                          >
                            거절
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}

                {outgoingRequests.length > 0 ? (
                  <div className="space-y-2">
                    <div className="text-sm font-semibold text-white">
                      보낸 요청
                    </div>
                    {outgoingRequests.map((row) => (
                      <div
                        key={row.id}
                        className="rounded-xl border border-white/10 bg-white/5 p-3"
                      >
                        <div className="text-sm">
                          {row.receiver_display_name ??
                            row.receiver_login_id ??
                            "-"}
                        </div>
                        <div className="mt-2">
                          <button
                            onClick={() => cancelBuddyRequest(row.id)}
                            className="cursor-pointer rounded-xl border border-white/15 bg-white/10 px-3 py-1 text-sm transition hover:bg-white/20"
                          >
                            요청 취소
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="text-sm text-gray-400">로그인 후 사용할 수 있어.</div>
            )}
          </PageCard>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <PageCard
          title="랭킹목록"
          action={
            <button
              onClick={() => setShowFullRanking((prev) => !prev)}
              className="cursor-pointer rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-sm transition hover:bg-white/20"
            >
              {showFullRanking ? "상세 닫기" : "상세보기"}
            </button>
          }
        >
          {top10Ranking.length === 0 ? (
            <div className="text-sm text-gray-400">랭킹 데이터가 아직 없어.</div>
          ) : (
            <div className="space-y-2">
              {top10Ranking.map((row, index) => (
                <div
                  key={row.userId}
                  className="grid grid-cols-[72px_1fr_1fr_1fr] items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm"
                >
                  <div className="font-bold text-center">{medalBadge(index + 1)}</div>
                  <div className="truncate">{row.className}</div>
                  <div className="truncate">{row.characterName}</div>
                  <div className="truncate text-right">
                    {row.ownerName} / {formatDecimal(row.combatPower)}
                  </div>
                </div>
              ))}
            </div>
          )}

          {showFullRanking ? (
            <div className="mt-4 max-h-[420px] overflow-y-auto rounded-2xl border border-white/10 bg-black/20 p-3">
              <div className="space-y-2">
                {ranking.map((row, index) => (
                  <div
                    key={`${row.userId}-${index}`}
                    className="grid grid-cols-[56px_1fr_1fr_1fr] items-center gap-3 rounded-xl bg-white/5 px-3 py-3 text-sm"
                  >
                    <div className="text-center font-semibold">{index + 1}</div>
                    <div className="truncate">{row.className}</div>
                    <div className="truncate">{row.characterName}</div>
                    <div className="truncate text-right">
                      {row.ownerName} / {formatDecimal(row.combatPower)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </PageCard>

        <div className="grid grid-cols-1 gap-4">
          <PageCard title="내 깐부">
            {buddies.length === 0 ? (
              <div className="text-sm text-gray-400">등록된 깐부가 아직 없어.</div>
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {buddies.slice(0, 6).map((buddy) => (
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

          <PageCard title="완성된 파티">
            {completedParties.length === 0 ? (
              <div className="text-sm text-gray-400">완성된 파티가 아직 없어.</div>
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {completedParties.slice(0, 4).map((party) => (
                  <button
                    key={party.party_id}
                    onClick={() => router.push(`/party/${party.party_id}`)}
                    className="cursor-pointer rounded-2xl border border-white/10 bg-black/20 p-4 text-left transition hover:bg-white/10"
                  >
                    <div className="font-semibold">
                      {party.party_name ?? party.raid_name ?? "-"}
                    </div>
                    <div className="mt-1 text-sm text-gray-400">
                      {party.raid_name ?? "-"} / {party.difficulty ?? "-"}
                    </div>
                    <div className="text-sm text-gray-400">
                      상태: {party.status}
                    </div>
                    <div className="text-sm text-gray-400">
                      멤버 수: {party.members}
                    </div>
                    <div className="mt-2 text-xs text-fuchsia-300">상세 보기</div>
                  </button>
                ))}
              </div>
            )}
          </PageCard>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_1fr]">
        <PageCard title="현재 파티구성">
          {currentPartyPreviews.length === 0 ? (
            <div className="text-sm text-gray-400">현재 구성된 파티가 아직 없어.</div>
          ) : (
            <div className="space-y-4">
              {currentPartyPreviews.slice(0, 4).map((party) => (
                <div
                  key={party.post_id}
                  className="rounded-2xl border border-white/10 bg-black/20 p-4"
                >
                  <div className="font-semibold text-white">
                    {party.title ?? party.raid_name ?? "-"}
                  </div>
                  <div className="mt-1 text-sm text-gray-400">
                    {party.raid_name ?? "-"} / {party.difficulty ?? "-"} /{" "}
                    {formatDate(party.raid_time)}
                  </div>
                  <div className="mt-2 text-sm text-gray-400">
                    실제 배치 인원: {party.filled_members}/{party.max_members}
                  </div>

                  <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                    {party.members
                      ?.filter((member) => !member.is_dummy)
                      .slice(0, 6)
                      .map((member, index) => (
                        <div
                          key={`${party.post_id}-${index}`}
                          className="rounded-xl bg-white/5 px-3 py-2 text-sm"
                        >
                          <div>
                            {member.party_number}파티 {member.slot_number}번 /{" "}
                            {member.role === "support" ? "💚 서포터" : "딜러"}
                          </div>
                          <div className="text-gray-300">
                            {member.character_name ?? "-"} / {member.class_name ?? "-"} /{" "}
                            {member.owner_name ?? "-"}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </PageCard>

        <PageCard
          title="깐부 골드 캐릭터"
          action={
            <button
              onClick={() => setShowAllBuddyGold((prev) => !prev)}
              className="cursor-pointer rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-sm transition hover:bg-white/20"
            >
              {showAllBuddyGold ? "상세 닫기" : "상세보기"}
            </button>
          }
        >
          {top10BuddyGold.length === 0 ? (
            <div className="text-sm text-gray-400">
              깐부 골드 캐릭터 데이터가 아직 없어.
            </div>
          ) : (
            <div className="space-y-2">
              {top10BuddyGold.map((character, index) => (
                <div
                  key={character.id}
                  className="grid grid-cols-[56px_1fr_1fr_1fr] items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm"
                >
                  <div className="text-center font-semibold">{index + 1}</div>
                  <div className="truncate">{character.class_name ?? "-"}</div>
                  <div className="truncate">{character.character_name ?? "-"}</div>
                  <div className="truncate text-right">
                    {character.effective_planned_raid ?? "-"}
                  </div>
                </div>
              ))}
            </div>
          )}

          {showAllBuddyGold ? (
            <div className="mt-4 max-h-[420px] overflow-y-auto rounded-2xl border border-white/10 bg-black/20 p-3">
              <div className="space-y-2">
                {buddyCharacters.map((character, index) => (
                  <div
                    key={`${character.id}-${index}`}
                    className="grid grid-cols-[56px_1fr_1fr_1fr] items-center gap-3 rounded-xl bg-white/5 px-3 py-3 text-sm"
                  >
                    <div className="text-center font-semibold">{index + 1}</div>
                    <div className="truncate">{character.class_name ?? "-"}</div>
                    <div className="truncate">{character.character_name ?? "-"}</div>
                    <div className="truncate text-right">
                      {character.effective_planned_raid ?? "-"}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </PageCard>
      </section>

      <AnnouncementHistory />
      <SiteFooter />
    </AppShell>
  );
}