"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

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

    if (postRes.data) {
      setPost(postRes.data as RaidPost);
    }

    setApplications((applicationRes.data as RaidApplication[]) ?? []);

    if (partyRes.data?.id) {
      const { data: partyMemberData } = await supabase
        .from("raid_party_members")
        .select("*")
        .eq("party_id", partyRes.data.id)
        .order("created_at", { ascending: true });

      setPartyMembers((partyMemberData as PartyMember[]) ?? []);
    } else {
      setPartyMembers([]);
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
    return <main className="p-10">불러오는 중...</main>;
  }

  if (!post) {
    return <main className="p-10">모집글을 찾지 못했어.</main>;
  }

  return (
    <main className="mx-auto max-w-5xl p-6 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{post.title ?? post.raid_name}</h1>
        <button onClick={() => router.push("/")} className="border px-4 py-2">
          메인으로
        </button>
      </div>

      <section className="rounded-2xl border p-6 space-y-2">
        <div>레이드: {post.raid_name}</div>
        <div>난이도: {post.difficulty ?? "-"}</div>
        <div>시간: {formatDate(post.raid_time)}</div>
        <div>설명: {post.description ?? "-"}</div>
        <div>최대 인원: {post.max_members}</div>
        <div>현재 신청: {applications.length}</div>
      </section>

      {user ? (
        <section className="rounded-2xl border p-6 space-y-4">
          <h2 className="text-xl font-semibold">레이드 신청</h2>

          {characters.length === 0 ? (
            <div className="text-sm text-gray-500">
              등록된 캐릭터가 없어. 마이페이지에서 먼저 캐릭터를 등록해줘.
            </div>
          ) : (
            <>
              <select
                className="w-full border p-2"
                value={selectedCharacterId}
                onChange={(e) => setSelectedCharacterId(e.target.value)}
              >
                {characters.map((character) => (
                  <option key={character.id} value={character.id}>
                    {character.character_name} / {character.class_name} / {character.role ?? "-"} / 전투력{" "}
                    {formatDecimal(character.combat_power)}
                  </option>
                ))}
              </select>

              <button onClick={applyToRaid} className="border px-4 py-2">
                신청하기
              </button>
            </>
          )}
        </section>
      ) : (
        <section className="rounded-2xl border p-6">
          <div className="text-sm text-gray-500">신청하려면 로그인해줘.</div>
        </section>
      )}

      <section className="rounded-2xl border p-6 space-y-4">
        <h2 className="text-xl font-semibold">신청자 목록</h2>
        {applications.length === 0 ? (
          <div className="text-sm text-gray-500">아직 신청자가 없어.</div>
        ) : (
          <div className="space-y-3">
            {applications.map((application) => (
              <div key={application.id} className="border p-3 rounded-xl">
                <div>유저 ID: {application.user_id}</div>
                <div>캐릭터 ID: {application.character_id}</div>
                <div>역할: {application.role ?? "-"}</div>
                <div>신청 시간: {formatDate(application.created_at)}</div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border p-6 space-y-4">
        <h2 className="text-xl font-semibold">현재 파티 구성</h2>
        {partyMembers.length === 0 ? (
          <div className="text-sm text-gray-500">아직 파티가 구성되지 않았어.</div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {partyMembers.map((member) => (
              <div key={member.id} className="border p-3 rounded-xl">
                <div>{member.is_dummy ? "더미 슬롯" : "실제 멤버"}</div>
                <div>역할: {member.role ?? "-"}</div>
                <div>유저 ID: {member.user_id ?? "-"}</div>
                <div>캐릭터 ID: {member.character_id ?? "-"}</div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}