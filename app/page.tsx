"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Character = {
  id: string;
  character_name: string | null;
  class_name: string | null;
  item_level: number | null;
  combat_power: number | null;
  server_name: string | null;
  profile_image_url: string | null;
  is_gold_earner: boolean;
  gold_exhausted?: boolean | null;
};

type GuildRankingRow = {
  user_id: string;
  login_id: string | null;
  display_name: string | null;
  guild_name: string | null;
  character_id: string;
  character_name: string | null;
  class_name: string | null;
  server_name: string | null;
  item_level: number | null;
  combat_power: number | null;
  profile_image_url: string | null;
};

function formatDecimal(value: number | null | undefined) {
  if (value === null || value === undefined) return "-";
  return new Intl.NumberFormat("ko-KR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

export default function HomePage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [guildRanking, setGuildRanking] = useState<GuildRankingRow[]>([]);
  const [seedName, setSeedName] = useState("");
  const [loading, setLoading] = useState(true);
  const [syncLoading, setSyncLoading] = useState(false);

  useEffect(() => {
    void init();
  }, []);

  async function init() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    setUser(user ?? null);

    if (!user) {
      setLoading(false);
      return;
    }

    await Promise.all([loadCharacters(user.id), loadGuildRanking()]);
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
      console.error("[loadCharacters] error:", error);
      return;
    }

    setCharacters((data as Character[]) ?? []);
  }

  async function loadGuildRanking() {
    const { data, error } = await supabase
      .from("v_guild_member_ranking")
      .select("*")
      .order("combat_power", { ascending: false, nullsFirst: false })
      .order("item_level", { ascending: false, nullsFirst: false });

    if (error) {
      console.error("[loadGuildRanking] error:", error);
      return;
    }

    setGuildRanking((data as GuildRankingRow[]) ?? []);
  }

  async function syncCharacters() {
    if (!seedName.trim()) {
      alert("대표 캐릭터 이름을 입력해줘");
      return;
    }

    setSyncLoading(true);

    try {
      const res = await fetch("/api/lostark/character", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          seedCharacterName: seedName.trim(),
        }),
      });

      const result = await res.json();

      if (!res.ok || !result.ok) {
        alert(result.error ?? "캐릭터 동기화 실패");
        return;
      }

      alert(`후보 캐릭터 ${result.count ?? 0}개 동기화 완료. 마이페이지에서 등록해줘.`);
      router.push("/mypage");
    } catch (error) {
      console.error("[syncCharacters] error:", error);
      alert("캐릭터 동기화 중 오류가 발생했어.");
    } finally {
      setSyncLoading(false);
    }
  }

  async function toggleGold(id: string, current: boolean) {
    const { error } = await supabase
      .from("characters")
      .update({ is_gold_earner: !current })
      .eq("id", id);

    if (error) {
      console.error("[toggleGold] error:", error);
      alert(error.message || "골드 캐릭터 설정 변경 실패");
      return;
    }

    if (user?.id) {
      await loadCharacters(user.id);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  if (loading) {
    return <div className="p-10">불러오는 중...</div>;
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
              <button onClick={handleLogout} className="border px-4 py-2">
                로그아웃
              </button>
            </>
          )}
        </div>
      </div>

      {user ? (
        <section className="rounded-2xl border p-6 space-y-4">
          <h2 className="text-xl font-semibold">캐릭터 후보 불러오기</h2>
          <input
            className="w-full border p-2"
            placeholder="대표 캐릭터 이름"
            value={seedName}
            onChange={(e) => setSeedName(e.target.value)}
          />
          <button onClick={syncCharacters} className="border px-4 py-2">
            {syncLoading ? "불러오는 중..." : "원정대 후보 동기화"}
          </button>
        </section>
      ) : null}

      <section className="rounded-2xl border p-6 space-y-4">
        <h2 className="text-xl font-semibold">길드원 랭킹 목록 (전투력 순)</h2>
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
              <div>{row.display_name ?? row.login_id}</div>
              <div>{row.class_name}</div>
              <div>전투력: {formatDecimal(row.combat_power)}</div>
              <div>아이템 레벨: {formatDecimal(row.item_level)}</div>
            </div>
          ))}
        </div>
      </section>

      {user ? (
        <section className="rounded-2xl border p-6 space-y-4">
          <h2 className="text-xl font-semibold">내 등록 캐릭터</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {characters.map((c) => (
              <div
                key={c.id}
                className={`border p-4 rounded-xl ${c.gold_exhausted ? "opacity-40" : ""}`}
              >
                {c.profile_image_url ? (
                  <img
                    src={c.profile_image_url}
                    width={80}
                    height={80}
                    alt={c.character_name ?? "character"}
                  />
                ) : null}

                <div className="mt-2 font-semibold">{c.character_name}</div>
                <div>{c.class_name}</div>
                <div>전투력: {formatDecimal(c.combat_power)}</div>
                <div>아이템 레벨: {formatDecimal(c.item_level)}</div>

                <button
                  className="mt-2 border px-2 py-1"
                  onClick={() => toggleGold(c.id, c.is_gold_earner)}
                >
                  {c.is_gold_earner ? "골드 캐릭터 해제" : "골드 캐릭터 설정"}
                </button>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}