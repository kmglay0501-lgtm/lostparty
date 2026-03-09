"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AppShell, { PageCard } from "@/components/AppShell";
import { inferSynergyLabelsFromClassEngraving } from "@/lib/lostark/synergy";

type PartySummaryRow = {
  party_id: string;
  post_id: string;
  raid_name: string | null;
  status: string | null;
  members: number | null;
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
};

type PartyMemberDetail = {
  id: string;
  party_id: string;
  post_id: string;
  user_id: string | null;
  character_id: string | null;
  role: string | null;
  is_dummy: boolean;
  created_at: string;
  party_number: number | null;
  slot_number: number | null;
  character_name: string | null;
  class_name: string | null;
  item_level: number | null;
  combat_power: number | null;
  class_engraving: string | null;
  synergy_labels: string[] | null;
  owner_name: string | null;
};

function formatDecimal(value: number | null | undefined) {
  if (value === null || value === undefined) return "-";
  return new Intl.NumberFormat("ko-KR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(value: string | null | undefined) {
  if (!value) return "미정";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("ko-KR");
}

function formatRole(role: string | null | undefined) {
  return role === "support" ? "💚 서포터" : "딜러";
}

function getSynergyLabels(member: PartyMemberDetail) {
  if (member.synergy_labels && member.synergy_labels.length > 0) {
    return member.synergy_labels;
  }

  return inferSynergyLabelsFromClassEngraving(
    member.class_name,
    member.class_engraving
  );
}

function SlotCard({ member }: { member: PartyMemberDetail }) {
  const synergyLabels = getSynergyLabels(member);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-400">
          {member.party_number ?? "-"}파티 {member.slot_number ?? "-"}번
        </div>
        <div className="text-sm font-medium">
          {member.is_dummy ? formatRole(member.role) : formatRole(member.role)}
        </div>
      </div>

      {member.is_dummy ? (
        <div className="text-sm text-gray-500">빈 슬롯</div>
      ) : (
        <>
          <div className="text-lg font-semibold">
            {member.character_name ?? "-"}
          </div>
          <div className="text-sm text-gray-400">
            {member.class_name ?? "-"} / {member.owner_name ?? "-"}
          </div>

          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-xl bg-black/20 px-3 py-2">
              <div className="text-gray-400">레벨</div>
              <div>{formatDecimal(member.item_level)}</div>
            </div>
            <div className="rounded-xl bg-black/20 px-3 py-2">
              <div className="text-gray-400">전투력</div>
              <div>{formatDecimal(member.combat_power)}</div>
            </div>
          </div>

          <div className="rounded-xl bg-black/20 px-3 py-2 text-sm">
            <div className="text-gray-400">직업각인</div>
            <div>{member.class_engraving ?? "-"}</div>
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

export default function PartyDetailPage() {
  const params = useParams<{ partyId: string }>();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [loading, setLoading] = useState(true);
  const [partySummary, setPartySummary] = useState<PartySummaryRow | null>(null);
  const [post, setPost] = useState<RaidPostRow | null>(null);
  const [members, setMembers] = useState<PartyMemberDetail[]>([]);

  useEffect(() => {
    void init();
  }, [params.partyId]);

  async function init() {
    setLoading(true);

    const { data: summaryData, error: summaryError } = await supabase
      .from("v_completed_parties")
      .select("*")
      .eq("party_id", params.partyId)
      .maybeSingle();

    if (summaryError || !summaryData) {
      setPartySummary(null);
      setPost(null);
      setMembers([]);
      setLoading(false);
      return;
    }

    const nextSummary = summaryData as PartySummaryRow;
    setPartySummary(nextSummary);

    const [postRes, memberRes] = await Promise.all([
      supabase
        .from("raid_posts")
        .select("*")
        .eq("id", nextSummary.post_id)
        .maybeSingle(),
      supabase
        .from("v_raid_party_member_details")
        .select("*")
        .eq("party_id", params.partyId)
        .order("party_number", { ascending: true })
        .order("slot_number", { ascending: true }),
    ]);

    setPost((postRes.data as RaidPostRow | null) ?? null);
    setMembers((memberRes.data as PartyMemberDetail[]) ?? []);
    setLoading(false);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#09090d] p-10 text-white">
        불러오는 중...
      </main>
    );
  }

  if (!partySummary) {
    return (
      <main className="min-h-screen bg-[#09090d] p-10 text-white">
        파티 정보를 찾지 못했어.
      </main>
    );
  }

  const groupedMembers = members.reduce<Record<number, PartyMemberDetail[]>>(
    (acc, member) => {
      const key = member.party_number ?? 1;
      if (!acc[key]) acc[key] = [];
      acc[key].push(member);
      return acc;
    },
    {}
  );

  return (
    <AppShell
      title={post?.title ?? post?.raid_name ?? partySummary.raid_name ?? "파티 상세"}
      subtitle={`${post?.raid_name ?? partySummary.raid_name ?? "-"} / ${
        post?.difficulty ?? "-"
      } / ${formatDate(post?.raid_time)}`}
      rightSlot={
        <div className="flex h-full items-start justify-end gap-2">
          <button
            onClick={() => router.push("/")}
            className="cursor-pointer rounded-xl border border-white/15 bg-white/10 px-4 py-2 transition hover:bg-white/20"
          >
            메인으로
          </button>
        </div>
      }
    >
      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <PageCard title="파티 정보">
          <div className="space-y-2 text-sm text-gray-300">
            <div>레이드: {post?.raid_name ?? partySummary.raid_name ?? "-"}</div>
            <div>난이도: {post?.difficulty ?? "-"}</div>
            <div>시간: {formatDate(post?.raid_time)}</div>
            <div>상태: {partySummary.status ?? "-"}</div>
            <div>설명: {post?.description ?? "-"}</div>
            <div>총 인원: {post?.max_members ?? "-"}</div>
            <div>실제 멤버 수: {partySummary.members ?? 0}</div>
          </div>
        </PageCard>

        <PageCard title="빠른 이동">
          <div className="space-y-3">
            {partySummary.post_id ? (
              <button
                onClick={() => router.push(`/raid/${partySummary.post_id}`)}
                className="cursor-pointer rounded-xl border border-white/15 bg-white/10 px-4 py-2 transition hover:bg-white/20"
              >
                연결된 모집글 보기
              </button>
            ) : null}

            <button
              onClick={() => router.push("/mypage")}
              className="cursor-pointer rounded-xl border border-white/15 bg-white/10 px-4 py-2 transition hover:bg-white/20"
            >
              마이페이지로
            </button>
          </div>
        </PageCard>
      </section>

      <PageCard title="파티 구성 상세">
        {members.length === 0 ? (
          <div className="text-sm text-gray-400">파티 멤버 데이터가 아직 없어.</div>
        ) : (
          <div className="space-y-8">
            {Object.entries(groupedMembers)
              .sort((a, b) => Number(a[0]) - Number(b[0]))
              .map(([partyNumber, partyMembers]) => (
                <div key={partyNumber} className="space-y-4">
                  <div className="text-xl font-bold">{partyNumber}파티</div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                    {partyMembers
                      .sort(
                        (a, b) =>
                          (a.slot_number ?? 99) - (b.slot_number ?? 99)
                      )
                      .map((member) => (
                        <SlotCard key={member.id} member={member} />
                      ))}
                  </div>
                </div>
              ))}
          </div>
        )}
      </PageCard>
    </AppShell>
  );
}