"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AppShell, { PageCard } from "@/components/AppShell";
import OwnerAnnouncementPanel from "@/components/OwnerAnnouncementPanel";
import AnnouncementHistory from "@/components/AnnouncementHistory";
import SiteFooter from "@/components/SiteFooter";
import { getKnownClassEngravingOptions } from "@/lib/lostark/synergy";

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
  profile_image_url?: string | null;
  is_gold_earner: boolean;
  planned_gold_raid: string | null;
  planned_gold_raids?: string[] | null;
  weekly_gold_raids?: string[] | null;
  weekly_gold_earned_count: number;
  weekly_cleared_raid_bases: string[];
  role: string | null;
  gold_exhausted?: boolean | null;
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

type ApiKeyStatus = {
  hasApiKey: boolean;
  maskedApiKey: string | null;
};

const CHARACTERS_PER_PAGE = 6;

const RAID_OPTION_LIST = [
  "베히모스/노말",
  "에키드나/하드",
  "에기르/노말",
  "에기르/하드",
  "아브렐슈드/노말",
  "아브렐슈드/하드",
  "모르둠/노말",
  "모르둠/하드",
  "지평의 성당/1단계",
  "지평의 성당/2단계",
  "지평의 성당/3단계",
  "아르모체/노말",
  "아르모체/하드",
  "세르카/노말",
  "세르카/하드",
  "세르카/나이트메어",
  "카제로스/노말",
  "카제로스/하드",
];

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

function normalizeRaidSelections(values: string[]) {
  return Array.from(
    new Set(values.map((v) => v.trim()).filter((v) => v.length > 0))
  ).slice(0, 3);
}

function getRemainingRaids(character: Character) {
  const selected = character.planned_gold_raids ?? [];
  const cleared = character.weekly_gold_raids ?? [];
  return selected.filter((raid) => !cleared.includes(raid));
}

export default function MyPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [apiKeyInput, setApiKeyInput] = useState("");
  const [apiKeyStatus, setApiKeyStatus] = useState<ApiKeyStatus>({
    hasApiKey: false,
    maskedApiKey: null,
  });
  const [editingApiKey, setEditingApiKey] = useState(false);
  const [savingApiKey, setSavingApiKey] = useState(false);
  const [deletingApiKey, setDeletingApiKey] = useState(false);

  const [syncCharacterName, setSyncCharacterName] = useState("");
  const [syncingCandidates, setSyncingCandidates] = useState(false);

  const [candidates, setCandidates] = useState<ImportCandidate[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [characters, setCharacters] = useState<Character[]>([]);
  const [characterPage, setCharacterPage] = useState(1);
  const [refreshingRegistered, setRefreshingRegistered] = useState(false);
  const [savingEngravingId, setSavingEngravingId] = useState<string | null>(null);
  const [savingRaidConfigId, setSavingRaidConfigId] = useState<string | null>(null);

  const [raidName, setRaidName] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [raidTime, setRaidTime] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [maxMembers, setMaxMembers] = useState(8);

  const [myPosts, setMyPosts] = useState<RaidPost[]>([]);
  const [myApplications, setMyApplications] = useState<RaidApplication[]>([]);
  const [buddies, setBuddies] = useState<BuddyRow[]>([]);

  const [raidSelections, setRaidSelections] = useState<Record<string, string[]>>({});

  useEffect(() => {
    void init();
  }, []);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(characters.length / CHARACTERS_PER_PAGE));
    if (characterPage > totalPages) {
      setCharacterPage(totalPages);
    }
  }, [characters, characterPage]);

  useEffect(() => {
    const nextState: Record<string, string[]> = {};
    for (const character of characters) {
      const base = character.planned_gold_raids ?? [];
      nextState[character.id] = [base[0] ?? "", base[1] ?? "", base[2] ?? ""];
    }
    setRaidSelections(nextState);
  }, [characters]);

  async function init() {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.replace("/login");
      return;
    }

    await Promise.all([
      loadApiKeyStatus(),
      loadCandidates(user.id),
      loadCharacters(user.id),
      loadMyPosts(user.id),
      loadMyApplications(user.id),
      loadBuddies(),
    ]);

    setLoading(false);
  }

  async function loadApiKeyStatus() {
    try {
      const res = await fetch("/api/account/api-key", {
        method: "GET",
      });

      const result = await res.json();

      if (!res.ok || !result.ok) {
        setApiKeyStatus({
          hasApiKey: false,
          maskedApiKey: null,
        });
        return;
      }

      setApiKeyStatus({
        hasApiKey: !!result.hasApiKey,
        maskedApiKey: result.maskedApiKey ?? null,
      });
    } catch (error) {
      console.error("[loadApiKeyStatus] error:", error);
      setApiKeyStatus({
        hasApiKey: false,
        maskedApiKey: null,
      });
    }
  }

  async function loadCandidates(userId: string) {
    const { data, error } = await supabase
      .from("character_import_candidates")
      .select("*")
      .eq("user_id", userId)
      .order("item_level", { ascending: false, nullsFirst: false })
      .order("combat_power", { ascending: false, nullsFirst: false });

    if (error) {
      setMessage(error.message || "후보 캐릭터 목록을 불러오지 못했어.");
      return;
    }

    setCandidates((data as ImportCandidate[]) ?? []);
  }

  async function loadCharacters(userId: string) {
    const { data, error } = await supabase
      .from("characters")
      .select("*")
      .eq("user_id", userId)
      .eq("is_registered", true)
      .order("item_level", { ascending: false, nullsFirst: false })
      .order("combat_power", { ascending: false, nullsFirst: false });

    if (error) {
      setMessage(error.message || "등록 캐릭터 목록을 불러오지 못했어.");
      return;
    }

    setCharacters((data as Character[]) ?? []);
  }

  async function loadMyPosts(userId: string) {
    const { data, error } = await supabase
      .from("raid_posts")
      .select("*")
      .eq("creator_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(error.message || "내 모집글 목록을 불러오지 못했어.");
      return;
    }

    setMyPosts((data as RaidPost[]) ?? []);
  }

  async function loadMyApplications(userId: string) {
    const { data, error } = await supabase
      .from("raid_post_applications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(error.message || "내 신청 목록을 불러오지 못했어.");
      return;
    }

    setMyApplications((data as RaidApplication[]) ?? []);
  }

  async function loadBuddies() {
    const { data, error } = await supabase
      .from("v_my_buddies")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(error.message || "깐부 목록을 불러오지 못했어.");
      return;
    }

    setBuddies((data as BuddyRow[]) ?? []);
  }

  async function saveApiKey() {
    setMessage("");
    setSavingApiKey(true);

    try {
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

      setApiKeyStatus({
        hasApiKey: !!result.hasApiKey,
        maskedApiKey: result.maskedApiKey ?? null,
      });
      setApiKeyInput("");
      setEditingApiKey(false);
      setMessage(result.message ?? "API Key 저장 완료");
    } catch (error) {
      console.error("[saveApiKey] error:", error);
      setMessage("API Key 저장 중 오류가 발생했어.");
    } finally {
      setSavingApiKey(false);
    }
  }

  async function deleteApiKey() {
    setMessage("");
    setDeletingApiKey(true);

    try {
      const res = await fetch("/api/account/api-key", {
        method: "DELETE",
      });

      const result = await res.json();

      if (!res.ok || !result.ok) {
        setMessage(result.error ?? "API Key 삭제 실패");
        return;
      }

      setApiKeyStatus({
        hasApiKey: false,
        maskedApiKey: null,
      });
      setApiKeyInput("");
      setEditingApiKey(false);
      setMessage(result.message ?? "API Key 삭제 완료");
    } catch (error) {
      console.error("[deleteApiKey] error:", error);
      setMessage("API Key 삭제 중 오류가 발생했어.");
    } finally {
      setDeletingApiKey(false);
    }
  }

  async function syncCandidatesByCharacterName() {
    setMessage("");

    if (!syncCharacterName.trim()) {
      setMessage("대표 캐릭터명을 입력해줘.");
      return;
    }

    setSyncingCandidates(true);

    try {
      const res = await fetch("/api/lostark/character", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mode: "sync-candidates",
          characterName: syncCharacterName.trim(),
        }),
      });

      const result = await res.json();

      if (!res.ok || !result.ok) {
        setMessage(result.error ?? "원정대 후보 불러오기 실패");
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        await loadCandidates(user.id);
      }

      setMessage(
        `${result.message ?? "원정대 후보 불러오기 완료"} (${result.importedCount ?? 0}명)`
      );
    } catch (error) {
      console.error("[syncCandidatesByCharacterName] error:", error);
      setMessage("원정대 후보 불러오기 중 오류가 발생했어.");
    } finally {
      setSyncingCandidates(false);
    }
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
    setCharacterPage(1);
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
    } catch (error) {
      console.error("[refreshRegisteredCharacters] error:", error);
      setMessage("등록 캐릭터 갱신 중 오류가 발생했어.");
    } finally {
      setRefreshingRegistered(false);
    }
  }

  async function setCharacterEngraving(characterId: string, classEngraving: string) {
    setMessage("");
    setSavingEngravingId(characterId);

    try {
      const res = await fetch("/api/characters/set-engraving", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          characterId,
          classEngraving,
        }),
      });

      const result = await res.json();

      if (!res.ok || !result.ok) {
        setMessage(result.error ?? "직업각인 저장 실패");
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        await loadCharacters(user.id);
      }

      setMessage(result.message ?? "직업각인 저장 완료");
    } catch (error) {
      console.error("[setCharacterEngraving] error:", error);
      setMessage("직업각인 저장 중 오류가 발생했어.");
    } finally {
      setSavingEngravingId(null);
    }
  }

  async function updatePlannedGoldRaids(characterId: string) {
    setMessage("");
    setSavingRaidConfigId(characterId);

    try {
      const nextValues = normalizeRaidSelections(raidSelections[characterId] ?? []);

      const { data, error } = await supabase.rpc("update_character_planned_gold_raids", {
        p_character_id: characterId,
        p_planned_gold_raids: nextValues,
      });

      if (error) {
        setMessage(error.message || "골드 레이드 설정 실패");
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        await loadCharacters(user.id);
      }

      setMessage(
        typeof data === "object" && data && "message" in data
          ? (data as { message?: string }).message ?? "골드 레이드 설정 완료"
          : "골드 레이드 설정 완료"
      );
    } catch (error) {
      console.error("[updatePlannedGoldRaids] error:", error);
      setMessage("골드 레이드 설정 중 오류가 발생했어.");
    } finally {
      setSavingRaidConfigId(null);
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
        maxMembers,
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
    setMaxMembers(8);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      await loadMyPosts(user.id);
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

    setMessage(result.message ?? "강제 파티 구성 완료");
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
    await loadBuddies();
  }

  const totalCharacterPages = Math.max(
    1,
    Math.ceil(characters.length / CHARACTERS_PER_PAGE)
  );
  const pagedCharacters = characters.slice(
    (characterPage - 1) * CHARACTERS_PER_PAGE,
    characterPage * CHARACTERS_PER_PAGE
  );

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
      subtitle="계정 등록, 캐릭터 등록, 모집 관리"
      rightSlot={
        <div className="flex h-full items-start justify-end gap-2">
          <button
            onClick={() => router.push("/buddy-raids")}
            className="cursor-pointer rounded-xl border border-white/15 bg-white/10 px-4 py-2 transition hover:bg-white/20"
          >
            깐부 레이드
          </button>
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
        <PageCard title="로스트아크 API Key 관리">
          <div className="space-y-4">
            {apiKeyStatus.hasApiKey && !editingApiKey ? (
              <>
                <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4">
                  <div className="text-sm text-gray-400">저장된 API Key</div>
                  <div className="mt-2 max-w-full overflow-hidden text-ellipsis whitespace-nowrap font-mono text-base text-white">
                    {apiKeyStatus.maskedApiKey ?? "-"}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setEditingApiKey(true)}
                    className="cursor-pointer rounded-xl border border-white/15 bg-white/10 px-4 py-2 transition hover:bg-white/20"
                  >
                    수정
                  </button>
                  <button
                    onClick={deleteApiKey}
                    disabled={deletingApiKey}
                    className="cursor-pointer rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-2 text-red-200 transition hover:bg-red-500/20 disabled:opacity-50"
                  >
                    {deletingApiKey ? "삭제 중..." : "삭제"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="text-sm text-gray-400">
                  {apiKeyStatus.hasApiKey
                    ? "새 API Key를 입력해서 수정해줘."
                    : "아직 저장된 API Key가 없어."}
                </div>

                <input
                  type="password"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/30 p-3 text-white outline-none"
                  placeholder="bearer 포함 또는 제외 가능"
                />

                <div className="flex gap-2">
                  <button
                    onClick={saveApiKey}
                    disabled={savingApiKey}
                    className="cursor-pointer rounded-xl border border-white/15 bg-white/10 px-4 py-2 transition hover:bg-white/20 disabled:opacity-50"
                  >
                    {savingApiKey
                      ? apiKeyStatus.hasApiKey
                        ? "수정 중..."
                        : "저장 중..."
                      : apiKeyStatus.hasApiKey
                      ? "수정 저장"
                      : "저장"}
                  </button>

                  {apiKeyStatus.hasApiKey ? (
                    <button
                      onClick={() => {
                        setEditingApiKey(false);
                        setApiKeyInput("");
                      }}
                      className="cursor-pointer rounded-xl border border-white/15 bg-white/10 px-4 py-2 transition hover:bg-white/20"
                    >
                      취소
                    </button>
                  ) : null}
                </div>
              </>
            )}
          </div>
        </PageCard>

        <PageCard title="등록 캐릭터 정보 갱신">
          <div className="space-y-3">
            <div className="text-sm text-gray-400">
              직업 / 서버 / 아이템 레벨 / 전투력 / 직업각인을 API로 갱신해.
            </div>
            <button
              onClick={refreshRegisteredCharacters}
              disabled={refreshingRegistered}
              className="cursor-pointer rounded-xl border border-white/15 bg-white/10 px-4 py-2 transition hover:bg-white/20 disabled:opacity-50"
            >
              {refreshingRegistered ? "갱신 중..." : "등록 캐릭터 정보 갱신"}
            </button>
          </div>
        </PageCard>
      </section>

      <PageCard
        title={`불러온 캐릭터 후보 (${candidates.length})`}
        action={
          <button
            onClick={registerSelectedCharacters}
            className="cursor-pointer rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-sm transition hover:bg-white/20"
          >
            선택 캐릭터 등록
          </button>
        }
      >
        <div className="mb-4 flex gap-2">
          <input
            className="flex-1 rounded-xl border border-white/10 bg-black/30 p-3 text-white outline-none"
            placeholder="대표 캐릭터명을 입력해줘"
            value={syncCharacterName}
            onChange={(e) => setSyncCharacterName(e.target.value)}
          />
          <button
            onClick={syncCandidatesByCharacterName}
            disabled={syncingCandidates}
            className="cursor-pointer rounded-xl border border-white/15 bg-white/10 px-4 py-2 transition hover:bg-white/20 disabled:opacity-50"
          >
            {syncingCandidates ? "불러오는 중..." : "원정대 불러오기"}
          </button>
        </div>

        {candidates.length === 0 ? (
          <div className="text-sm text-gray-400">
            아직 불러온 후보 캐릭터가 없어. 대표 캐릭터 기준 동기화를 먼저 해줘.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {candidates.map((candidate) => {
              const checked = selectedIds.includes(candidate.id);

              return (
                <label
                  key={candidate.id}
                  className="cursor-pointer rounded-2xl border border-white/10 bg-black/20 p-4"
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        setSelectedIds((prev) =>
                          e.target.checked
                            ? [...prev, candidate.id]
                            : prev.filter((id) => id !== candidate.id)
                        );
                      }}
                      className="mt-1"
                    />

                    <div className="min-w-0 flex-1">
                      {candidate.profile_image_url ? (
                        <img
                          src={candidate.profile_image_url}
                          alt={candidate.character_name ?? "candidate"}
                          className="mb-3 h-20 w-20 rounded-xl object-cover"
                        />
                      ) : null}

                      <div className="font-semibold">
                        {candidate.character_name ?? "-"}
                      </div>
                      <div className="text-sm text-gray-400">
                        {candidate.class_name ?? "-"}
                      </div>
                      <div className="text-sm text-gray-400">
                        서버: {candidate.server_name ?? "-"}
                      </div>
                      <div className="text-sm text-gray-400">
                        아이템 레벨: {formatDecimal(candidate.item_level)}
                      </div>
                      <div className="text-sm text-gray-400">
                        전투력: {formatDecimal(candidate.combat_power)}
                      </div>
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        )}
      </PageCard>

      <PageCard
        title={`등록된 캐릭터 (${characters.length})`}
        action={
          totalCharacterPages > 1 ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCharacterPage((prev) => Math.max(1, prev - 1))}
                disabled={characterPage === 1}
                className="cursor-pointer rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm transition hover:bg-white/20 disabled:opacity-50"
              >
                이전
              </button>
              <span className="text-sm text-gray-300">
                {characterPage} / {totalCharacterPages}
              </span>
              <button
                onClick={() =>
                  setCharacterPage((prev) => Math.min(totalCharacterPages, prev + 1))
                }
                disabled={characterPage === totalCharacterPages}
                className="cursor-pointer rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm transition hover:bg-white/20 disabled:opacity-50"
              >
                다음
              </button>
            </div>
          ) : null
        }
      >
        {characters.length === 0 ? (
          <div className="text-sm text-gray-400">등록된 캐릭터가 아직 없어.</div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {pagedCharacters.map((character) => {
                const options = getKnownClassEngravingOptions(character.class_name);
                const currentSelection = raidSelections[character.id] ?? ["", "", ""];
                const remainingRaids = getRemainingRaids(character);

                return (
                  <div
                    key={character.id}
                    className={`rounded-2xl border border-white/10 bg-black/20 p-4 ${
                      character.gold_exhausted ? "opacity-50" : ""
                    }`}
                  >
                    {character.profile_image_url ? (
                      <img
                        src={character.profile_image_url}
                        alt={character.character_name ?? "character"}
                        className="mb-3 h-24 w-24 rounded-xl object-cover"
                      />
                    ) : null}

                    <div className="font-semibold">
                      {character.character_name ?? "-"}
                    </div>
                    <div className="text-sm text-gray-400">
                      {character.class_name ?? "-"}
                    </div>
                    <div className="text-sm text-gray-400">
                      서버: {character.server_name ?? "-"}
                    </div>
                    <div className="text-sm text-gray-400">
                      아이템 레벨: {formatDecimal(character.item_level)}
                    </div>
                    <div className="text-sm text-gray-400">
                      전투력: {formatDecimal(character.combat_power)}
                    </div>
                    <div className="text-sm text-gray-400">
                      역할: {character.role === "support" ? "💚 서포터" : "딜러"}
                    </div>
                    <div className="text-sm text-gray-400">
                      주간 골드 획득: {character.weekly_gold_earned_count}/3
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        onClick={() =>
                          toggleGoldCharacter(character.id, character.is_gold_earner)
                        }
                        className="cursor-pointer rounded-xl border border-white/15 bg-white/10 px-3 py-1 text-sm transition hover:bg-white/20"
                      >
                        {character.is_gold_earner
                          ? "골드 캐릭터 해제"
                          : "골드 캐릭터 지정"}
                      </button>

                      <button
                        onClick={() => deleteCharacter(character.id)}
                        className="cursor-pointer rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-1 text-sm text-red-200 transition hover:bg-red-500/20"
                      >
                        삭제
                      </button>
                    </div>

                    {options.length > 0 ? (
                      <select
                        className="mt-3 w-full rounded-xl border border-white/10 bg-black/30 p-3 text-white outline-none"
                        value={character.class_engraving ?? ""}
                        onChange={(e) =>
                          setCharacterEngraving(character.id, e.target.value)
                        }
                        disabled={savingEngravingId === character.id}
                      >
                        <option value="">직업각인을 선택해줘</option>
                        {options.map((option) => (
                          <option
                            key={`${character.id}-${option.value}`}
                            value={option.value}
                          >
                            {option.label}
                          </option>
                        ))}
                      </select>
                    ) : null}

                    <div className="mt-3 rounded-xl bg-white/5 px-3 py-2 text-sm">
                      <div className="text-gray-400">현재 직업각인</div>
                      <div>{character.class_engraving ?? "-"}</div>
                    </div>

                    <div className="mt-2 rounded-xl bg-white/5 px-3 py-2 text-sm">
                      <div className="text-gray-400">시너지</div>
                      <div>
                        {character.synergy_labels && character.synergy_labels.length > 0
                          ? character.synergy_labels.join(" / ")
                          : "-"}
                      </div>
                    </div>

                    <div className="mt-3 rounded-xl border border-white/10 bg-white/5 p-3">
                      <div className="text-sm font-semibold text-white">
                        골드 받을 레이드 3개 설정
                      </div>

                      <div className="mt-3 space-y-2">
                        {[0, 1, 2].map((index) => (
                          <select
                            key={`${character.id}-raid-${index}`}
                            className="w-full rounded-xl border border-white/10 bg-black/30 p-3 text-white outline-none"
                            value={currentSelection[index] ?? ""}
                            onChange={(e) => {
                              setRaidSelections((prev) => {
                                const next = [...(prev[character.id] ?? ["", "", ""])];
                                next[index] = e.target.value;
                                return {
                                  ...prev,
                                  [character.id]: next,
                                };
                              });
                            }}
                          >
                            <option value="">레이드 선택</option>
                            {RAID_OPTION_LIST.map((raid) => (
                              <option key={`${character.id}-${index}-${raid}`} value={raid}>
                                {raid}
                              </option>
                            ))}
                          </select>
                        ))}
                      </div>

                      <button
                        onClick={() => updatePlannedGoldRaids(character.id)}
                        disabled={savingRaidConfigId === character.id}
                        className="mt-3 cursor-pointer rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-sm transition hover:bg-white/20 disabled:opacity-50"
                      >
                        {savingRaidConfigId === character.id
                          ? "저장 중..."
                          : "골드 레이드 저장"}
                      </button>

                      <div className="mt-3 text-sm text-gray-300">
                        현재 설정:{" "}
                        {(character.planned_gold_raids ?? []).length > 0
                          ? (character.planned_gold_raids ?? []).join(", ")
                          : "-"}
                      </div>

                      <div className="mt-2 text-sm text-fuchsia-200">
                        남은 레이드: {remainingRaids.length > 0 ? remainingRaids.join(", ") : "-"}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {totalCharacterPages > 1 ? (
              <div className="mt-4 flex justify-center gap-2">
                {Array.from({ length: totalCharacterPages }).map((_, index) => {
                  const page = index + 1;
                  return (
                    <button
                      key={page}
                      onClick={() => setCharacterPage(page)}
                      className={`cursor-pointer rounded-xl px-3 py-2 text-sm transition ${
                        characterPage === page
                          ? "border border-fuchsia-400/20 bg-fuchsia-500/15 text-fuchsia-200"
                          : "border border-white/15 bg-white/10 text-white hover:bg-white/20"
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </>
        )}
      </PageCard>

      <PageCard title="깐부 관리">
        {buddies.length === 0 ? (
          <div className="text-sm text-gray-400">등록된 깐부가 아직 없어.</div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {buddies.map((buddy) => (
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

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_1fr]">
        <PageCard title="레이드 모집 생성">
          <div className="space-y-3">
            <input
              className="w-full rounded-xl border border-white/10 bg-black/30 p-3 text-white outline-none"
              placeholder="레이드 이름"
              value={raidName}
              onChange={(e) => setRaidName(e.target.value)}
            />
            <input
              className="w-full rounded-xl border border-white/10 bg-black/30 p-3 text-white outline-none"
              placeholder="난이도"
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
            />
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
            <input
              className="w-full rounded-xl border border-white/10 bg-black/30 p-3 text-white outline-none"
              type="number"
              min={2}
              max={16}
              value={maxMembers}
              onChange={(e) => setMaxMembers(Number(e.target.value))}
            />
            <button
              onClick={createRaidPost}
              className="cursor-pointer rounded-xl border border-white/15 bg-white/10 px-4 py-2 transition hover:bg-white/20"
            >
              모집 생성
            </button>
          </div>
        </PageCard>

        <PageCard title="내가 개설한 레이드 모집">
          {myPosts.length === 0 ? (
            <div className="text-sm text-gray-400">내가 만든 모집글이 아직 없어.</div>
          ) : (
            <div className="space-y-3">
              {myPosts.map((post) => (
                <div
                  key={post.id}
                  className="rounded-2xl border border-white/10 bg-black/20 p-4"
                >
                  <div className="font-semibold">{post.title ?? post.raid_name}</div>
                  <div className="mt-1 text-sm text-gray-400">
                    {post.raid_name} / {post.difficulty ?? "-"}
                  </div>
                  <div className="text-sm text-gray-400">
                    시간: {formatDate(post.raid_time)}
                  </div>
                  <div className="text-sm text-gray-400">
                    최대 인원: {post.max_members}
                  </div>

                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => forceCreateParty(post.id)}
                      className="cursor-pointer rounded-xl border border-white/15 bg-white/10 px-3 py-1 text-sm transition hover:bg-white/20"
                    >
                      강제 파티 구성
                    </button>
                    <button
                      onClick={() => deleteMyPost(post.id)}
                      className="cursor-pointer rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-1 text-sm text-red-200 transition hover:bg-red-500/20"
                    >
                      모집 삭제
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </PageCard>
      </section>

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
                  역할: {application.role ?? "-"}
                </div>
                <div className="text-sm text-gray-500">
                  신청 시각: {formatDate(application.created_at)}
                </div>

                <button
                  onClick={() => cancelApplication(application.id)}
                  className="mt-3 cursor-pointer rounded-xl border border-white/15 bg-white/10 px-3 py-1 text-sm transition hover:bg-white/20"
                >
                  신청 취소
                </button>
              </div>
            ))}
          </div>
        )}
      </PageCard>

      <AnnouncementHistory />
      <SiteFooter />
    </AppShell>
  );
}