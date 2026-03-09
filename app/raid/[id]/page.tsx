"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  formatRoleLabel,
  inferSynergyLabelsFromClassEngraving,
} from "@/lib/lostark/synergy";

type RaidPost = {
  id: string;
  raid_name: string;
  difficulty: string | null;
  raid_time: string | null;
  title: string | null;
  description: string | null;
  creator_id: string;
  max_members: number;
};

type RaidApplication = {
  id: string;
  user_id: string;
  character_id: string;
  role: string | null;
  created_at: string;
};

type Character = {
  id: string;
  character_name: string | null;
  class_name: string | null;
  role: string | null;
  combat_power: number | null;
  item_level: number | null;
};

type PartyMember = {
  id: string;
  party_id: string;
  user_id: string | null;
  character_id: string | null;
  role: string | null;
  is_dummy: boolean;
  created_at: string;
  party_number: number | null;
  slot_number: number | null;
};

type CharacterLite = {
  id: string;
  character_name: string | null;
  class_name: string | null;
  role: string | null;
  item_level: number | null;
  combat_power: number | null;
  class_engraving: string | null;
  synergy_labels: string[] | null;
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

function getSynergyLabels(character: CharacterLite | null | undefined) {
  if (!character) return [];
  if (character.synergy_labels && character.synergy_labels.length > 0) {
    return character.synergy_labels;
  }
  return inferSynergyLabelsFromClassEngraving(
    character.class_name,
    character.class_engraving
  );
}

function SlotDetailCard({
  slotLabel,
  member,
  character,
}: {
  slotLabel: string;
  member: PartyMember;
  character: CharacterLite | null;
}) {
  const synergyLabels = getSynergyLabels(character);
  const roleLabel = member.is_dummy
    ? member.role ?? "-"
    : formatRoleLabel(member.role ?? character?.role);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-400">{slotLabel}</div>
        <div className="text-sm font-medium">{roleLabel}</div>
      </div>

      {member.is_dummy ? (
        <div className="text-sm text-gray-500">빈 슬롯</div>
      ) : (
        <>
          <div className="text-lg font-semibold">
            {character?.character_name ?? member.character_id ?? "-"}
          </div>
          <div className="text-sm text-gray-400">
            {character?.class_name ?? "-"}
          </div>

          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-xl bg-black/20 px-3 py-2">
              <div className="text-gray-400">레벨</div>
              <div>{formatDecimal(character?.item_level)}</div>
            </div>
            <div className="rounded-xl bg-black/20 px-3 py-2">
              <div className="text-gray-400">전투력</div>
              <div>{formatDecimal(character?.combat_power)}</div>
            </div>
          </div>

          <div className="rounded-xl bg-black/20 px-3 py-2 text-sm">
            <div className="text-gray-400">직업각인</div>
            <div>{character?.class_engraving ?? "-"}</div>
          </div>

          <div className="rounded-xl bg-black/20 px-3 py-2 text-sm">
            <div className="text-gray-400">시너지</div>
            <div>
              {synergyLabels.length > 0 ? synergyLabels.join(" / ") : "-"}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function RaidDetailPage() {
  const supabase = useMemo(() => createClient(), []);
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [post, setPost] = useState<RaidPost | null>(null);
  const [applications, setApplications] = useState<RaidApplication[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedCharacterId, setSelectedCharacterId] = useState("");
  const [partyMembers, setPartyMembers] = useState<PartyMember[]>([]);
  const [characterMap, setCharacterMap] = useState<Record<string, CharacterLite>>(
    {}
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void init();
  }, [params.id]);

  async function init() {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    setUser(user ?? null);

    const [postRes, applicationRes, partyRes] = await Promise.all([
      supabase.from("raid_posts").select("*").eq("id", params.id).maybeSingle(),
      supabase
        .from("raid_post_applications")
        .select("*")
        .eq("post_id", params.id)
        .order("created_at", { ascending: true }),
      supabase
        .from("raid_parties")
        .select("id")
        .eq("post_id", params.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const nextPost = (postRes.data as RaidPost | null) ?? null;
    const nextApplications = (applicationRes.data as RaidApplication[]) ?? [];

    setPost(nextPost);
    setApplications(nextApplications);

    let nextPartyMembers: PartyMember[] = [];

    if (partyRes.data?.id) {
      const { data: partyMemberData } = await supabase
        .from("raid_party_members")
        .select("*")
        .eq("party_id", partyRes.data.id)
        .order("party_number", { ascending: true })
        .order("slot_number", { ascending: true });

      nextPartyMembers = (partyMemberData as PartyMember[]) ?? [];
      setPartyMembers(nextPartyMembers);
    } else {
      setPartyMembers([]);
    }

    const characterIds = Array.from(
      new Set(
        [
          ...nextApplications.map((row) => row.character_id),
          ...nextPartyMembers
            .map((row) => row.character_id)
            .filter((value): value is string => !!value),
        ].filter((value): value is string => !!value)
      )
    );

    if (characterIds.length > 0) {
      const { data: characterInfo } = await supabase
        .from("characters")
        .select(
          "id, character_name, class_name, role, item_level, combat_power, class_engraving, synergy_labels"
        )
        .in("id", characterIds);

      const map: Record<string, CharacterLite> = {};
      for (const row of (characterInfo as CharacterLite[]) ?? []) {
        map[row.id] = row;
      }
      setCharacterMap(map);
    } else {
      setCharacterMap({});
    }

    if (user) {
      const { data: characterData } = await supabase
        .from("characters")
        .select("id, character_name, class_name, role, combat_power, item_level")
        .eq("user_id", user.id)
        .eq("is_registered", true)
        .order("combat_power", { ascending: false, nullsFirst: false });

      const nextCharacters = (characterData as Character[]) ?? [];
      setCharacters(nextCharacters);

      if (nextCharacters.length > 0) {
        setSelectedCharacterId(nextCharacters[0].id);
      }
    }

    setLoading(false);
  }

  async function applyToRaid() {
    if (!selectedCharacterId) {
      alert("신청할 캐릭터를 선택해줘.");
      return;
    }

    const res = await fetch("/api/raid/apply", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        postId: params.id,
        characterId: selectedCharacterId,
      }),
    });

    const result = await res.json();

    if (!res.ok || !result.ok) {
      alert(result.error ?? "레이드 신청 실패");
      return;
    }

    await init();
    alert(result.message ?? "레이드 신청 완료");
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0b0b10] text-white p-10">
        불러오는 중...
      </main>
    );
  }

  if (!post) {
    return (
      <main className="min-h-screen bg-[#0b0b10] text-white p-10">
        모집글을 찾지 못했어.
      </main>
    );
  }

  const recruitableSlots = Math.max((post.max_members ?? 0) - 1, 0);
  const applicantApplications = applications.filter(
    (application) => application.user_id !== post.creator_id
  );
  const myExistingApplication = user
    ? applications.find((application) => application.user_id === user.id)
    : null;
  const isCreator = !!user && user.id === post.creator_id;

  const groupedPartyMembers = partyMembers.reduce<Record<number, PartyMember[]>>(
    (acc, member) => {
      const partyNumber = member.party_number ?? 1;
      if (!acc[partyNumber]) acc[partyNumber] = [];
      acc[partyNumber].push(member);
      return acc;
    },
    {}
  );

  return (
    <main className="min-h-screen bg-[#0b0b10] text-white">
      <div className="mx-auto max-w-6xl p-6 space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-extrabold tracking-tight">
            {post.title ?? post.raid_name}
          </h1>
          <button
            onClick={() => router.push("/")}
            className="rounded-xl border border-white/15 bg-white/5 px-4 py-2"
          >
            메인으로
          </button>
        </div>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-6 space-y-3">
          <div>레이드: {post.raid_name}</div>
          <div>난이도: {post.difficulty ?? "-"}</div>
          <div>시간: {formatDate(post.raid_time)}</div>
          <div>설명: {post.description ?? "-"}</div>
          <div>총 인원: {post.max_members}</div>
          <div>추가 모집 가능 인원: {recruitableSlots}</div>
          <div>
            현재 신청: {applicantApplications.length}/{recruitableSlots}
          </div>
        </section>

        {user ? (
          <section className="rounded-3xl border border-white/10 bg-white/5 p-6 space-y-4">
            <h2 className="text-xl font-semibold">레이드 신청</h2>

            {isCreator ? (
              <div className="rounded-2xl bg-blue-500/10 px-4 py-3 text-blue-300">
                이 모집은 네가 개설한 모집이야. 개설 캐릭터는 모집 생성 시 자동 참가 처리돼서
                별도로 다시 신청할 수 없어.
              </div>
            ) : myExistingApplication ? (
              <div className="rounded-2xl bg-white/10 px-4 py-3 text-gray-200">
                이미 이 모집 또는 같은 레이드 같은 시간 모집에 신청되어 있어.
              </div>
            ) : characters.length === 0 ? (
              <div className="text-sm text-gray-400">
                등록된 캐릭터가 없어. 마이페이지에서 먼저 캐릭터를 등록해줘.
              </div>
            ) : (
              <>
                <select
                  className="w-full rounded-xl border border-white/10 bg-black/30 p-3"
                  value={selectedCharacterId}
                  onChange={(e) => setSelectedCharacterId(e.target.value)}
                >
                  {characters.map((character) => (
                    <option key={character.id} value={character.id}>
                      {character.character_name} / {character.class_name} /{" "}
                      {formatRoleLabel(character.role)} / 전투력{" "}
                      {formatDecimal(character.combat_power)}
                    </option>
                  ))}
                </select>

                <button
                  onClick={applyToRaid}
                  className="rounded-xl border border-white/15 bg-white/5 px-4 py-2"
                >
                  신청하기
                </button>
              </>
            )}
          </section>
        ) : (
          <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="text-sm text-gray-400">신청하려면 로그인해줘.</div>
          </section>
        )}

        <section className="rounded-3xl border border-white/10 bg-white/5 p-6 space-y-4">
          <h2 className="text-xl font-semibold">신청자 목록</h2>
          {applicantApplications.length === 0 ? (
            <div className="text-sm text-gray-400">아직 추가 신청자가 없어.</div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {applicantApplications.map((application) => {
                const character = characterMap[application.character_id];
                const synergyLabels = getSynergyLabels(character);

                return (
                  <div
                    key={application.id}
                    className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-2"
                  >
                    <div className="text-lg font-semibold">
                      {character?.character_name ?? application.character_id}
                    </div>
                    <div className="text-sm text-gray-400">
                      {character?.class_name ?? "-"} /{" "}
                      {formatRoleLabel(application.role ?? character?.role)}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="rounded-xl bg-black/20 px-3 py-2">
                        <div className="text-gray-400">레벨</div>
                        <div>{formatDecimal(character?.item_level)}</div>
                      </div>
                      <div className="rounded-xl bg-black/20 px-3 py-2">
                        <div className="text-gray-400">전투력</div>
                        <div>{formatDecimal(character?.combat_power)}</div>
                      </div>
                    </div>
                    <div className="rounded-xl bg-black/20 px-3 py-2 text-sm">
                      <div className="text-gray-400">시너지</div>
                      <div>
                        {synergyLabels.length > 0
                          ? synergyLabels.join(" / ")
                          : "-"}
                      </div>
                    </div>
                    <div className="text-sm text-gray-500">
                      신청 시간: {formatDate(application.created_at)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-6 space-y-6">
          <h2 className="text-xl font-semibold">현재 파티 구성</h2>

          {partyMembers.length === 0 ? (
            <div className="text-sm text-gray-400">아직 파티가 구성되지 않았어.</div>
          ) : (
            <div className="space-y-8">
              {Object.entries(groupedPartyMembers)
                .sort((a, b) => Number(a[0]) - Number(b[0]))
                .map(([partyNumber, members]) => (
                  <div key={partyNumber} className="space-y-4">
                    <div className="text-xl font-bold">{partyNumber}파티</div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                      {members
                        .sort(
                          (a, b) =>
                            (a.slot_number ?? 99) - (b.slot_number ?? 99)
                        )
                        .map((member) => {
                          const character = member.character_id
                            ? characterMap[member.character_id] ?? null
                            : null;

                          return (
                            <SlotDetailCard
                              key={member.id}
                              slotLabel={`${member.party_number ?? "-"}파티 ${
                                member.slot_number ?? "-"
                              }번`}
                              member={member}
                              character={character}
                            />
                          );
                        })}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}