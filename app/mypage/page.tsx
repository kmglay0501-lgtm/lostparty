"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AppShell, { PageCard } from "@/components/AppShell";
import OwnerAnnouncementPanel from "@/components/OwnerAnnouncementPanel";

type ImportCandidate = {
  id: string;
  character_name: string | null;
  class_name: string | null;
  server_name: string | null;
  item_level: number | null;
  combat_power: number | null;
  profile_image_url: string | null;
};

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
  is_registered?: boolean;
  class_engraving?: string | null;
  synergy_labels?: string[] | null;
};

type RaidPost = {
  id: string;
  raid_name: string;
  difficulty: string | null;
  raid_time: string | null;
  title: string | null;
  description: string | null;
  max_members: number;
};

type RaidApplication = {
  id: string;
  post_id: string;
  character_id: string;
  user_id?: string;
  role: string | null;
  created_at: string;
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

type RaidOption = {
  id: string;
  name: string;
  raid_category: string | null;
};

type RaidDifficultyOption = {
  id: string;
  difficulty: string;
  required_item_level: number | null;
  raid_id: string;
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

function parseRaidCategoryToMembers(value: string | null | undefined) {
  if (!value) return 0;
  const match = value.match(/\d+/);
  if (!match) return 0;
  return Number(match[0]);
}

export default function MyPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [candidates, setCandidates] = useState<ImportCandidate[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [refreshingRegistered, setRefreshingRegistered] = useState(false);

  const [raidOptions, setRaidOptions] = useState<RaidOption[]>([]);
  const [difficultyOptions, setDifficultyOptions] = useState<RaidDifficultyOption[]>([]);

  const [raidName, setRaidName] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [raidTime, setRaidTime] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [creatorCharacterId, setCreatorCharacterId] = useState("");

  const [myPosts, setMyPosts] = useState<RaidPost[]>([]);
  const [myApplications, setMyApplications] = useState<RaidApplication[]>([]);
  const [buddies, setBuddies] = useState<BuddyRow[]>([]);

  useEffect(() => {
    void init();
  }, []);

  async function init() {
    setLoading(true);
    setMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.replace("/login");
      return;
    }

    await Promise.all([
      loadCandidates(user.id),
      loadCharacters(user.id),
      loadMyPosts(user.id),
      loadMyApplications(user.id),
      loadBuddies(),
      loadRaidOptions(),
    ]);

    setLoading(false);
  }

  async function loadRaidOptions() {
    const [raidsRes, diffRes] = await Promise.all([
      supabase
        .from("raids")
        .select("id, name, raid_category")
        .order("created_at", { ascending: true }),
      supabase
        .from("raid_difficulties")
        .select("id, difficulty, required_item_level, raid_id")
        .order("created_at", { ascending: true }),
    ]);

    if (raidsRes.error) {
      setMessage(raidsRes.error.message || "레이드 목록을 불러오지 못했어.");
      return;
    }

    if (diffRes.error) {
      setMessage(diffRes.error.message || "레이드 난이도 목록을 불러오지 못했어.");
      return;
    }

    setRaidOptions((raidsRes.data as RaidOption[]) ?? []);
    setDifficultyOptions((diffRes.data as RaidDifficultyOption[]) ?? []);
  }

  async function loadCandidates(userId: string) {
    const { data, error } = await supabase
      .from("character_import_candidates")
      .select("*")
      .eq("user_id", userId)
      .order("combat_power", { ascending: false, nullsFirst: false })
      .order("item_level", { ascending: false, nullsFirst: false });

    if (!error) {
      setCandidates((data as ImportCandidate[]) ?? []);
    }
  }

  async function loadCharacters(userId: string) {
    const { data, error } = await supabase
      .from("characters")
      .select("*")
      .eq("user_id", userId)
      .eq("is_registered", true)
      .order("combat_power", { ascending: false, nullsFirst: false })
      .order("item_level", { ascending: false, nullsFirst: false });

    if (!error) {
      setCharacters((data as Character[]) ?? []);
    }
  }

  async function loadMyPosts(userId: string) {
    const { data, error } = await supabase
      .from("raid_posts")
      .select("*")
      .eq("creator_id", userId)
      .order("created_at", { ascending: false });

    if (!error) {
      setMyPosts((data as RaidPost[]) ?? []);
    }
  }

  async function loadMyApplications(userId: string) {
    const { data, error } = await supabase
      .from("raid_post_applications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (!error) {
      setMyApplications((data as RaidApplication[]) ?? []);
    }
  }

  async function loadBuddies() {
    const { data, error } = await supabase
      .from("v_my_buddies")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error) {
      setBuddies((data as BuddyRow[]) ?? []);
    }
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
    setMessage("API Key 저장 완료");
  }

  async function registerSelectedCharacters() {
    setMessage("");

    if (selectedIds.length === 0) {
      setMessage("등록할 캐릭터를 선택해줘.");
      return;
    }

    const res = await fetch("/api/characters/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ candidateIds: selectedIds }),
    });

    const result = await res.json();

    if (!res.ok || !result.ok) {
      setMessage(result.error ?? "캐릭터 등록 실패");
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      await Promise.all([loadCandidates(user.id), loadCharacters(user.id)]);
    }

    setSelectedIds([]);
    setMessage(result.message ?? "선택 캐릭터 등록 완료");
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
        await Promise.all([loadCandidates(user.id), loadCharacters(user.id)]);
      }

      setMessage(result.message ?? "등록 캐릭터 갱신 완료");
    } catch {
      setMessage("등록 캐릭터 갱신 중 오류가 발생했어.");
    } finally {
      setRefreshingRegistered(false);
    }
  }

  async function deleteCharacter(characterId: string) {
    const { error } = await supabase.from("characters").delete().eq("id", characterId);

    if (error) {
      setMessage(error.message || "캐릭터 삭제 실패");
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      await loadCharacters(user.id);
    }

    setMessage("캐릭터 삭제 완료");
  }

  async function toggleGoldCharacter(characterId: string, current: boolean) {
    const { error } = await supabase
      .from("characters")
      .update({ is_gold_earner: !current })
      .eq("id", characterId);

    if (error) {
      setMessage(error.message || "골드 캐릭터 설정 실패");
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      await loadCharacters(user.id);
    }

    setMessage("골드 캐릭터 설정 완료");
  }

  async function updatePlannedRaid(characterId: string, value: string) {
    const { error } = await supabase
      .from("characters")
      .update({ planned_gold_raid: value.trim() || null })
      .eq("id", characterId);

    if (error) {
      setMessage(error.message || "예정 골드 레이드 저장 실패");
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      await loadCharacters(user.id);
    }

    setMessage("예정 골드 레이드 저장 완료");
  }

  async function createRaidPost() {
    setMessage("");

    const res = await fetch("/api/raid/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        raidName,
        difficulty,
        raidTime,
        title,
        description,
        creatorCharacterId,
      }),
    });

    const result = await res.json();

    if (!res.ok || !result.ok) {
      setMessage(result.error ?? "레이드 모집 생성 실패");
      return;
    }

    setRaidName("");
    setDifficulty("");
    setRaidTime("");
    setTitle("");
    setDescription("");
    setCreatorCharacterId("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      await Promise.all([loadMyPosts(user.id), loadMyApplications(user.id)]);
    }

    setMessage(result.message ?? "레이드 모집 생성 완료");
  }

  async function deleteMyPost(postId: string) {
    const { error } = await supabase.from("raid_posts").delete().eq("id", postId);

    if (error) {
      setMessage(error.message || "모집 삭제 실패");
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      await loadMyPosts(user.id);
    }

    setMessage("모집 삭제 완료");
  }

  async function forceCreateParty(postId: string) {
    const res = await fetch("/api/raid/force-party", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ postId }),
    });

    const result = await res.json();

    if (!res.ok || !result.ok) {
      setMessage(result.error ?? "강제 파티 구성 실패");
      return;
    }

    setMessage(
      `${result.message ?? "강제 파티 구성 완료"} / 배치 ${
        result.assignedCount ?? 0
      }명 / 미배치 ${result.unassignedCount ?? 0}명`
    );
  }

  async function cancelApplication(applicationId: string) {
    const res = await fetch("/api/raid/cancel", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ applicationId }),
    });

    const result = await res.json();

    if (!res.ok || !result.ok) {
      setMessage(result.error ?? "신청 취소 실패");
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      await loadMyApplications(user.id);
    }

    setMessage(result.message ?? "신청 취소 완료");
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

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      await loadMyPosts(user.id);
    }

    setMessage(
      `${result.message ?? "깐부 자동 파티 생성 완료"} (${result.createdCount ?? 0}개)`
    );
  }

  const selectedRaidRow = raidOptions.find((row) => row.name === raidName) ?? null;
  const filteredDifficultyOptions = selectedRaidRow
    ? difficultyOptions.filter((row) => row.raid_id === selectedRaidRow.id)
    : [];

  const selectedDifficultyRow =
    filteredDifficultyOptions.find((row) => row.difficulty === difficulty) ?? null;

  const eligibleCreatorCharacters = selectedDifficultyRow
    ? characters.filter(
        (row) =>
          (row.item_level ?? 0) >= (selectedDifficultyRow.required_item_level ?? 0)
      )
    : [];

  const totalMembers = selectedRaidRow
    ? parseRaidCategoryToMembers(selectedRaidRow.raid_category)
    : 0;

  const partyCount = totalMembers > 0 ? totalMembers / 4 : 0;
  const recruitableSlots = totalMembers > 0 ? Math.max(totalMembers - 1, 0) : 0;

  useEffect(() => {
    if (!creatorCharacterId) return;
    const exists = eligibleCreatorCharacters.some((row) => row.id === creatorCharacterId);
    if (!exists) setCreatorCharacterId("");
  }, [creatorCharacterId, eligibleCreatorCharacters]);

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
      subtitle="내 캐릭터, 모집, 신청, 깐부, 공지를 한 화면에서 관리해."
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
        <PageCard title="API Key 저장">
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

        <PageCard title="깐부 관리">
          <div className="space-y-3">
            <button
              onClick={createBuddyAutoParty}
              className="cursor-pointer rounded-xl border border-white/15 bg-white/10 px-4 py-2 transition hover:bg-white/20"
            >
              깐부 자동 파티 생성
            </button>

            {buddies.length === 0 ? (
              <div className="text-sm text-gray-400">등록된 깐부가 아직 없어.</div>
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {buddies.map((buddy) => (
                  <div
                    key={buddy.buddy_user_id}
                    className="rounded-2xl border border-white/10 bg-black/20 p-4"
                  >
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
                ))}
              </div>
            )}
          </div>
        </PageCard>
      </section>

      <PageCard
        title={`불러온 캐릭터 후보 (${candidates.length})`}
        action={
          <button
            onClick={init}
            className="cursor-pointer rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-sm transition hover:bg-white/20"
          >
            새로고침
          </button>
        }
      >
        {candidates.length === 0 ? (
          <div className="text-sm text-gray-400">
            아직 불러온 후보 캐릭터가 없어.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {candidates.map((c) => {
                const checked = selectedIds.includes(c.id);

                return (
                  <label
                    key={c.id}
                    className="cursor-pointer rounded-2xl border border-white/10 bg-black/20 p-4"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        setSelectedIds((prev) =>
                          e.target.checked
                            ? [...prev, c.id]
                            : prev.filter((id) => id !== c.id)
                        );
                      }}
                    />
                    <div className="mt-3 font-semibold">{c.character_name}</div>
                    <div className="text-sm text-gray-400">{c.class_name}</div>
                    <div className="text-sm text-gray-400">
                      전투력: {formatDecimal(c.combat_power)}
                    </div>
                    <div className="text-sm text-gray-400">
                      아이템 레벨: {formatDecimal(c.item_level)}
                    </div>
                  </label>
                );
              })}
            </div>

            <button
              onClick={registerSelectedCharacters}
              className="mt-4 cursor-pointer rounded-xl border border-white/15 bg-white/10 px-4 py-2 transition hover:bg-white/20"
            >
              선택 캐릭터 등록
            </button>
          </>
        )}
      </PageCard>

      <PageCard
        title={`등록된 캐릭터 (${characters.length})`}
        action={
          <button
            onClick={refreshRegisteredCharacters}
            disabled={refreshingRegistered}
            className="cursor-pointer rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-sm transition hover:bg-white/20 disabled:opacity-50"
          >
            {refreshingRegistered ? "갱신 중..." : "등록 캐릭터 정보 갱신"}
          </button>
        }
      >
        {characters.length === 0 ? (
          <div className="text-sm text-gray-400">등록된 캐릭터가 아직 없어.</div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {characters.map((c) => (
              <div
                key={c.id}
                className={`rounded-2xl border border-white/10 bg-black/20 p-4 ${
                  c.gold_exhausted ? "opacity-50" : ""
                }`}
              >
                <div className="font-semibold">{c.character_name}</div>
                <div className="text-sm text-gray-400">{c.class_name}</div>
                <div className="text-sm text-gray-400">
                  역할: {c.role === "support" ? "💚 서포터" : "딜러"}
                </div>
                <div className="text-sm text-gray-400">
                  전투력: {formatDecimal(c.combat_power)}
                </div>
                <div className="text-sm text-gray-400">
                  아이템 레벨: {formatDecimal(c.item_level)}
                </div>
                <div className="text-sm text-gray-400">
                  직업각인: {c.class_engraving ?? "-"}
                </div>
                <div className="text-sm text-gray-400">
                  시너지: {c.synergy_labels?.length ? c.synergy_labels.join(" / ") : "-"}
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={() => toggleGoldCharacter(c.id, c.is_gold_earner)}
                    className="cursor-pointer rounded-xl border border-white/15 bg-white/10 px-3 py-1 transition hover:bg-white/20"
                  >
                    {c.is_gold_earner ? "골드 캐릭터 해제" : "골드 캐릭터 지정"}
                  </button>
                  <button
                    onClick={() => deleteCharacter(c.id)}
                    className="cursor-pointer rounded-xl border border-white/15 bg-white/10 px-3 py-1 transition hover:bg-white/20"
                  >
                    삭제
                  </button>
                </div>

                <input
                  className="mt-3 w-full rounded-xl border border-white/10 bg-black/30 p-2 text-white outline-none"
                  placeholder="예정 골드 레이드"
                  defaultValue={c.planned_gold_raid ?? ""}
                  onBlur={(e) => updatePlannedRaid(c.id, e.target.value)}
                />
              </div>
            ))}
          </div>
        )}
      </PageCard>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_1fr]">
        <PageCard title="레이드 모집 생성">
          <div className="space-y-3">
            <select
              className="w-full rounded-xl border border-white/10 bg-black/30 p-3 text-white outline-none"
              value={raidName}
              onChange={(e) => {
                setRaidName(e.target.value);
                setDifficulty("");
                setCreatorCharacterId("");
              }}
            >
              <option value="">레이드를 선택해줘</option>
              {raidOptions.map((raid) => (
                <option key={raid.id} value={raid.name}>
                  {raid.name}
                </option>
              ))}
            </select>

            <select
              className="w-full rounded-xl border border-white/10 bg-black/30 p-3 text-white outline-none"
              value={difficulty}
              onChange={(e) => {
                setDifficulty(e.target.value);
                setCreatorCharacterId("");
              }}
              disabled={!raidName}
            >
              <option value="">
                {!raidName ? "먼저 레이드를 선택해줘" : "난이도를 선택해줘"}
              </option>
              {filteredDifficultyOptions.map((row) => (
                <option key={row.id} value={row.difficulty}>
                  {row.difficulty}
                  {row.required_item_level ? ` / 권장 ${row.required_item_level}` : ""}
                </option>
              ))}
            </select>

            <select
              className="w-full rounded-xl border border-white/10 bg-black/30 p-3 text-white outline-none"
              value={creatorCharacterId}
              onChange={(e) => setCreatorCharacterId(e.target.value)}
              disabled={!selectedDifficultyRow}
            >
              <option value="">
                {!selectedDifficultyRow
                  ? "먼저 레이드와 난이도를 선택해줘"
                  : "개설 캐릭터를 선택해줘"}
              </option>
              {eligibleCreatorCharacters.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.character_name ?? "-"} / {row.class_name ?? "-"} /{" "}
                  {row.role === "support" ? "💚 서포터" : "딜러"} / 아이템 레벨{" "}
                  {formatDecimal(row.item_level)}
                </option>
              ))}
            </select>

            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-gray-300">
              총 인원: {totalMembers}명 / 파티 수: {partyCount}개 / 추가 모집 가능 인원:{" "}
              {recruitableSlots}명
            </div>

            <input
              className="w-full rounded-xl border border-white/10 bg-black/30 p-3 text-white outline-none"
              type="datetime-local"
              value={raidTime}
              onChange={(e) => setRaidTime(e.target.value)}
            />
            <input
              className="w-full rounded-xl border border-white/10 bg-black/30 p-3 text-white outline-none"
              placeholder="제목"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <textarea
              className="w-full rounded-xl border border-white/10 bg-black/30 p-3 text-white outline-none"
              placeholder="설명"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />

            <button
              onClick={createRaidPost}
              className="cursor-pointer rounded-xl border border-white/15 bg-white/10 px-4 py-2 transition hover:bg-white/20"
            >
              모집 생성
            </button>
          </div>
        </PageCard>

        <PageCard title="내 신청 목록">
          {myApplications.length === 0 ? (
            <div className="text-sm text-gray-400">신청한 레이드가 아직 없어.</div>
          ) : (
            <div className="space-y-3">
              {myApplications.map((application) => (
                <div
                  key={application.id}
                  className="rounded-2xl border border-white/10 bg-black/20 p-4"
                >
                  <div className="text-sm text-gray-300">모집 ID: {application.post_id}</div>
                  <div className="text-sm text-gray-300">
                    캐릭터 ID: {application.character_id}
                  </div>
                  <div className="text-sm text-gray-300">
                    역할: {application.role === "support" ? "💚 서포터" : "딜러"}
                  </div>
                  <div className="text-sm text-gray-400">
                    신청 시각: {formatDate(application.created_at)}
                  </div>
                  <button
                    onClick={() => cancelApplication(application.id)}
                    className="mt-3 cursor-pointer rounded-xl border border-white/15 bg-white/10 px-3 py-1 transition hover:bg-white/20"
                  >
                    신청 취소
                  </button>
                </div>
              ))}
            </div>
          )}
        </PageCard>
      </section>

      <PageCard title="내가 개설한 레이드 모집">
        {myPosts.length === 0 ? (
          <div className="text-sm text-gray-400">내가 만든 모집글이 아직 없어.</div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {myPosts.map((post) => (
              <div
                key={post.id}
                className="rounded-2xl border border-white/10 bg-black/20 p-4"
              >
                <div className="font-semibold">{post.title ?? post.raid_name}</div>
                <div className="mt-1 text-sm text-gray-400">{post.raid_name}</div>
                <div className="text-sm text-gray-400">난이도: {post.difficulty ?? "-"}</div>
                <div className="text-sm text-gray-400">시간: {formatDate(post.raid_time)}</div>
                <div className="text-sm text-gray-400">총 인원: {post.max_members}</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={() => forceCreateParty(post.id)}
                    className="cursor-pointer rounded-xl border border-white/15 bg-white/10 px-3 py-1 transition hover:bg-white/20"
                  >
                    강제 파티 구성
                  </button>
                  <button
                    onClick={() => deleteMyPost(post.id)}
                    className="cursor-pointer rounded-xl border border-white/15 bg-white/10 px-3 py-1 transition hover:bg-white/20"
                  >
                    모집 삭제
                  </button>
                  <button
                    onClick={() => router.push(`/raid/${post.id}`)}
                    className="cursor-pointer rounded-xl border border-white/15 bg-white/10 px-3 py-1 transition hover:bg-white/20"
                  >
                    상세 보기
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </PageCard>
    </AppShell>
  );
}