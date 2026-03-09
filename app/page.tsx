"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type GuildRankingRow = {
  user_id: string;
  display_name: string | null;
  guild_name: string | null;
  character_id: string;
  character_name: string | null;
  server_name: string | null;
  class_name: string | null;
  item_level: number | null;
  combat_power: number | null;
  profile_image_url: string | null;
};

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
  raid_name: string | null;
  status: string;
  members: number;
};

type MemberRow = {
  id: string;
  login_id: string | null;
  display_name: string | null;
  guild_name: string | null;
  is_alt_account: boolean | null;
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
};

function formatDecimal(value: number | null | undefined) {
  if (value === null || value === undefined) return "-";
  return new Intl.NumberFormat("ko-KR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("ko-KR");
}

export default function HomePage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [guildRanking, setGuildRanking] = useState<GuildRankingRow[]>([]);
  const [raidPosts, setRaidPosts] = useState<RaidPostRow[]>([]);
  const [completedParties, setCompletedParties] = useState<CompletedPartyRow[]>(
    []
  );
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [buddies, setBuddies] = useState<BuddyListRow[]>([]);
  const [buddyCharacters, setBuddyCharacters] = useState<BuddyCharacterRow[]>(
    []
  );
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

    const [rankingRes, postRes, partyRes, memberRes, buddyRes, buddyCharRes] =
      await Promise.all([
        supabase
          .from("v_guild_member_ranking")
          .select("*")
          .order("combat_power", { ascending: false, nullsFirst: false })
          .order("item_level", { ascending: false, nullsFirst: false }),
        supabase
          .from("v_active_raid_posts")
          .select("*")
          .order("raid_time", { ascending: true, nullsFirst: false }),
        supabase
          .from("v_completed_parties")
          .select("*")
          .order("members", { ascending: false }),
        supabase
          .from("profiles")
          .select("id, login_id, display_name, guild_name, is_alt_account")
          .order("display_name", { ascending: true }),
        user
          ? supabase
              .from("v_my_buddies")
              .select("*")
              .order("created_at", { ascending: false })
          : Promise.resolve({ data: [] as any[] }),
        user
          ? supabase
              .from("v_buddy_characters")
              .select("*")
              .order("combat_power", { ascending: false, nullsFirst: false })
          : Promise.resolve({ data: [] as any[] }),
      ]);

    setGuildRanking((rankingRes.data as GuildRankingRow[]) ?? []);
    setRaidPosts((postRes.data as RaidPostRow[]) ?? []);
    setCompletedParties((partyRes.data as CompletedPartyRow[]) ?? []);
    setMembers((memberRes.data as MemberRow[]) ?? []);
    setBuddies((buddyRes.data as BuddyListRow[]) ?? []);
    setBuddyCharacters((buddyCharRes.data as BuddyCharacterRow[]) ?? []);
    setLoading(false);
  }

  async function addBuddy() {
    setMessage("");

    if (!buddyInput.trim()) {
      setMessage("회원가입 ID를 입력해줘.");
      return;
    }

    const res = await fetch("/api/buddy/add", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ loginId: buddyInput.trim() }),
    });

    const result = await res.json();

    if (!res.ok || !result.ok) {
      setMessage(result.error ?? "깐부 추가 실패");
      return;
    }

    setBuddyInput("");
    setMessage(result.message ?? "깐부 추가 완료");
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
      `${result.message ?? "깐부 자동 파티 생성 완료"} (${result.createdCount ?? 0}개)`
    );
    await init();
  }

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  function groupedBuddyCharacters() {
    const map = new Map<string, BuddyCharacterRow[]>();

    for (const row of buddyCharacters) {
      const key = row.user_id;
      const prev = map.get(key) ?? [];
      prev.push(row);
      map.set(key, prev);
    }

    return Array.from(map.entries());
  }

  if (loading) {
    return <main className="p-10">불러오는 중...</main>;
  }

  return (
    <main className="mx-auto max-w-7xl p-6 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">LOSTPARTY</h1>
        <div className="flex gap-2">
          {!user ? (
            <>
              <button
                onClick={() => router.push("/login")}
                className="border px-4 py-2"
              >
                로그인
              </button>
              <button
                onClick={() => router.push("/signup")}
                className="border px-4 py-2"
              >
                회원가입
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => router.push("/mypage")}
                className="border px-4 py-2"
              >
                마이페이지
              </button>
              <button onClick={logout} className="border px-4 py-2">
                로그아웃
              </button>
            </>
          )}
        </div>
      </div>

      {message ? (
        <div className="rounded-xl bg-gray-100 px-4 py-3">{message}</div>
      ) : null}

      <section className="rounded-2xl border p-6 space-y-4">
        <h2 className="text-xl font-semibold">길드원 랭킹 목록 (전투력 순)</h2>
        {guildRanking.length === 0 ? (
          <div className="text-sm text-gray-500">랭킹 데이터가 아직 없어.</div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {guildRanking.map((row) => (
              <div key={row.character_id} className="border p-4 rounded-xl">
                {row.profile_image_url ? (
                  <img
                    src={row.profile_image_url}
                    width={80}
                    height={80}
                    alt={row.character_name ?? "character"}
                  />
                ) : null}
                <div className="mt-2 font-semibold">{row.character_name}</div>
                <div>{row.display_name ?? "-"}</div>
                <div>{row.class_name}</div>
                <div>전투력: {formatDecimal(row.combat_power)}</div>
                <div>아이템 레벨: {formatDecimal(row.item_level)}</div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">진행중인 레이드 신청</h2>
          {user ? (
            <button
              onClick={() => router.push("/mypage")}
              className="border px-4 py-2"
            >
              모집 만들기
            </button>
          ) : null}
        </div>

        {raidPosts.length === 0 ? (
          <div className="text-sm text-gray-500">진행중인 모집이 아직 없어.</div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {raidPosts.map((post) => (
              <button
                key={post.id}
                onClick={() => router.push(`/raid/${post.id}`)}
                className="border p-4 rounded-xl text-left"
              >
                <div className="font-semibold">{post.title ?? post.raid_name}</div>
                <div className="text-sm text-gray-500">
                  {post.raid_name} / {post.difficulty ?? "-"}
                </div>
                <div className="text-sm text-gray-500">
                  시간: {formatDate(post.raid_time)}
                </div>
                <div className="text-sm text-gray-500">
                  신청 인원: {post.current_members}/{post.max_members}
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border p-6 space-y-4">
        <h2 className="text-xl font-semibold">구성완료된 파티목록</h2>
        {completedParties.length === 0 ? (
          <div className="text-sm text-gray-500">완성된 파티가 아직 없어.</div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {completedParties.map((party) => (
              <div key={party.party_id} className="border p-4 rounded-xl">
                <div className="font-semibold">{party.raid_name ?? "-"}</div>
                <div className="text-sm text-gray-500">상태: {party.status}</div>
                <div className="text-sm text-gray-500">멤버 수: {party.members}</div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">깐부 목록</h2>
          {user ? (
            <button onClick={createBuddyAutoParty} className="border px-4 py-2">
              깐부 자동 파티 생성
            </button>
          ) : null}
        </div>

        {user ? (
          <div className="flex gap-2">
            <input
              className="flex-1 border p-2"
              placeholder="회원가입 ID로 깐부 추가"
              value={buddyInput}
              onChange={(e) => setBuddyInput(e.target.value)}
            />
            <button onClick={addBuddy} className="border px-4 py-2">
              깐부 추가
            </button>
          </div>
        ) : null}

        {buddies.length === 0 ? (
          <div className="text-sm text-gray-500">등록된 깐부가 아직 없어.</div>
        ) : (
          <div className="space-y-4">
            {buddies.map((buddy) => (
              <div key={buddy.buddy_user_id} className="border p-4 rounded-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold">
                      {buddy.display_name ?? buddy.login_id ?? "-"}
                    </div>
                    <div className="text-sm text-gray-500">
                      ID: {buddy.login_id ?? "-"}
                    </div>
                    <div className="text-sm text-gray-500">
                      길드: {buddy.guild_name ?? "-"}
                    </div>
                  </div>
                  <button
                    onClick={() => removeBuddy(buddy.buddy_user_id)}
                    className="border px-3 py-1"
                  >
                    깐부 삭제
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border p-6 space-y-4">
        <h2 className="text-xl font-semibold">깐부 골드 캐릭터 목록</h2>
        {groupedBuddyCharacters().length === 0 ? (
          <div className="text-sm text-gray-500">깐부 캐릭터 데이터가 아직 없어.</div>
        ) : (
          <div className="space-y-6">
            {groupedBuddyCharacters().map(([buddyUserId, chars]) => {
              const buddy = buddies.find((b) => b.buddy_user_id === buddyUserId);

              return (
                <div key={buddyUserId} className="space-y-3">
                  <div className="text-lg font-semibold">
                    {buddy?.display_name ?? buddy?.login_id ?? buddyUserId}
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {chars.map((character) => (
                      <div
                        key={character.id}
                        className={`border p-4 rounded-xl ${
                          character.gold_exhausted ? "opacity-40" : ""
                        }`}
                      >
                        {character.profile_image_url ? (
                          <img
                            src={character.profile_image_url}
                            width={80}
                            height={80}
                            alt={character.character_name ?? "buddy character"}
                          />
                        ) : null}
                        <div className="mt-2 font-semibold">
                          {character.character_name}
                        </div>
                        <div>{character.class_name}</div>
                        <div>역할: {character.role ?? "-"}</div>
                        <div>전투력: {formatDecimal(character.combat_power)}</div>
                        <div>아이템 레벨: {formatDecimal(character.item_level)}</div>
                        <div>
                          골드 캐릭터: {character.is_gold_earner ? "예" : "아니오"}
                        </div>
                        <div>
                          예정 골드 레이드: {character.planned_gold_raid ?? "-"}
                        </div>
                        <div>
                          주간 골드 획득: {character.weekly_gold_earned_count}/3
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="rounded-2xl border p-6 space-y-4">
        <h2 className="text-xl font-semibold">가입된 회원 목록</h2>
        {members.length === 0 ? (
          <div className="text-sm text-gray-500">가입된 회원이 아직 없어.</div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {members.map((member) => (
              <div key={member.id} className="border p-4 rounded-xl">
                <div className="font-semibold">
                  {member.display_name ?? member.login_id ?? "-"}
                </div>
                <div className="text-sm text-gray-500">
                  ID: {member.login_id ?? "-"}
                </div>
                <div className="text-sm text-gray-500">
                  길드: {member.guild_name ?? "-"}
                </div>
                <div className="text-sm text-gray-500">
                  {member.is_alt_account ? "부계정" : "본계정"}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}