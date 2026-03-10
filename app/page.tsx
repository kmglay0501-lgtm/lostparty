"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

import AppShell, { PageCard } from "@/components/AppShell";
import AnnouncementHistory from "@/components/AnnouncementHistory";
import SiteFooter from "@/components/SiteFooter";

type RaidPost = {
  id: string;
  raid_name: string;
  difficulty: string | null;
  raid_time: string | null;
  title: string | null;
  max_members: number;
};

type PartyMember = {
  character_name: string;
  class_name: string;
  role: string;
  party_number: number;
  position: number;
};

function formatDate(value: string | null) {
  if (!value) return "미정";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("ko-KR");
}

export default function HomePage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<RaidPost[]>([]);
  const [partyMembers, setPartyMembers] = useState<PartyMember[]>([]);

  useEffect(() => {
    init();
  }, []);

  async function init() {
    setLoading(true);

    const { data: postData } = await supabase
      .from("raid_posts")
      .select("*")
      .order("created_at", { ascending: false });

    setPosts(postData ?? []);

    const { data: memberData } = await supabase
      .from("raid_party_members")
      .select("*");

    setPartyMembers(memberData ?? []);

    setLoading(false);
  }

  function getMembers(postId: string) {
    return partyMembers.filter((m: any) => m.post_id === postId);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#09090d] text-white p-10">
        로딩중...
      </main>
    );
  }

  return (
    <AppShell
      title="Lost Party"
      subtitle="로스트아크 레이드 파티 자동 구성"
      rightSlot={
        <div className="flex gap-2">

          <button
            onClick={() => router.push("/buddy-raids")}
            className="cursor-pointer rounded-xl border border-white/20 px-4 py-2 hover:bg-white/10"
          >
            깐부 레이드
          </button>

          <button
            onClick={() => router.push("/mypage")}
            className="cursor-pointer rounded-xl border border-white/20 px-4 py-2 hover:bg-white/10"
          >
            마이페이지
          </button>

        </div>
      }
    >

      <PageCard title="진행중인 레이드 모집">

        {posts.length === 0 && (
          <div className="text-gray-400">
            진행중인 모집이 아직 없어.
          </div>
        )}

        <div className="space-y-4">

          {posts.map((post) => {

            const members = getMembers(post.id);

            return (
              <div
                key={post.id}
                className="border border-white/10 rounded-xl p-4 bg-black/30"
              >

                <div className="flex justify-between">

                  <div>

                    <div className="font-bold text-lg">
                      {post.title ?? post.raid_name}
                    </div>

                    <div className="text-sm text-gray-400">
                      {post.raid_name} / {post.difficulty ?? "-"}
                    </div>

                    <div className="text-sm text-gray-400">
                      시간 : {formatDate(post.raid_time)}
                    </div>

                  </div>

                  <button
                    onClick={() => router.push(`/raid/${post.id}`)}
                    className="border px-4 py-2 rounded hover:bg-white/10"
                  >
                    상세보기
                  </button>

                </div>

                {members.length > 0 && (
                  <div className="mt-4 grid grid-cols-4 gap-2">

                    {members.map((m, i) => (
                      <div
                        key={i}
                        className="text-sm border border-white/10 p-2 rounded"
                      >
                        <div>
                          {m.role === "support" ? "💚 " : ""}
                          {m.character_name}
                        </div>

                        <div className="text-gray-400">
                          {m.class_name}
                        </div>
                      </div>
                    ))}

                  </div>
                )}

              </div>
            );
          })}

        </div>

      </PageCard>

      <AnnouncementHistory />

      <SiteFooter />

    </AppShell>
  );
}