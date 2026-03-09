"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

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
};

type RaidPost = {
  id: string;
  raid_name: string;
  difficulty: string | null;
  raid_time: string | null;
  title: string | null;
  description: string | null;
  max_members: number;
  creator_id?: string;
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
  if (!value) return "-";
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
      .order("combat_power", { ascending: false, nullsFirst: false })
      .order("item_level", { ascending: false, nullsFirst: false });

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
    } catch (error) {
      console.error("[refreshRegisteredCharacters] error:", error);
      setMessage("등록 캐릭터 갱신 중 오류가 발생했어.");
    } finally {
      setRefreshingRegistered(false);
    }
  }

  async function deleteCharacter(characterId: string) {
    const { error } = await supabase
      .from("characters")
      .delete()
      .eq("id", characterId);

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

    if (!raidName) {
      setMessage("레이드를 선택해줘.");
      return;
    }

    if (!difficulty) {
      setMessage("난이도를 선택해줘.");
      return;
    }

    if (!raidTime) {
      setMessage("레이드 시간을 입력해줘.");
      return;
    }

    if (!title.trim()) {
      setMessage("제목을 입력해줘.");
      return;
    }

    if (!creatorCharacterId) {
      setMessage("개설 캐릭터를 선택해줘.");
      return;
    }

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

    setMessage(
      `${result.message ?? "레이드 모집 생성 완료"} / 개설 캐릭터 ${
        result.creatorCharacterName ?? "-"
      } 자동 참가 / 추가 모집 가능 인원 ${result.recruitableSlots ?? "-"}명`
    );
  }

  async function deleteMyPost(postId: string) {
    const { error } = await supabase
      .from("raid_posts")
      .delete()
      .eq("id", postId);

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
    if (!exists) {
      setCreatorCharacterId("");
    }
  }, [creatorCharacterId, eligibleCreatorCharacters]);

  if (loading) {
    return <main className="p-10">불러오는 중...</main>;
  }

  return (
    <main className="mx-auto max-w-7xl p-6 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">마이페이지</h1>
        <button onClick={() => router.push("/")} className="border px-4 py-2">
          메인으로
        </button>
      </div>

      {message ? (
        <div className="rounded-xl bg-gray-100 px-4 py-3">{message}</div>
      ) : null}

      <section className="rounded-2xl border p-6 space-y-4">
        <h2 className="text-xl font-semibold">API Key 저장</h2>
        <input
          type="password"
          value={apiKeyInput}
          onChange={(e) => setApiKeyInput(e.target.value)}
          className="w-full border p-2"
          placeholder="bearer 포함 또는 제외 가능"
        />
        <button onClick={saveApiKey} className="border px-4 py-2">
          저장
        </button>
      </section>

      <section className="rounded-2xl border p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            불러온 캐릭터 후보 ({candidates.length})
          </h2>
          <button onClick={init} className="border px-4 py-2">
            새로고침
          </button>
        </div>

        {candidates.length === 0 ? (
          <div className="text-sm text-gray-500">
            아직 불러온 후보 캐릭터가 없어. 메인 페이지에서 대표 캐릭터명으로 원정대 후보를 먼저 동기화해줘.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {candidates.map((c) => {
              const checked = selectedIds.includes(c.id);

              return (
                <label
                  key={c.id}
                  className="border p-4 rounded-xl block cursor-pointer"
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
                  {c.profile_image_url ? (
                    <img
                      src={c.profile_image_url}
                      width={80}
                      height={80}
                      alt={c.character_name ?? "candidate"}
                      className="mt-2"
                    />
                  ) : null}
                  <div className="mt-2 font-semibold">{c.character_name}</div>
                  <div>{c.class_name}</div>
                  <div>전투력: {formatDecimal(c.combat_power)}</div>
                  <div>아이템 레벨: {formatDecimal(c.item_level)}</div>
                </label>
              );
            })}
          </div>
        )}

        <button onClick={registerSelectedCharacters} className="border px-4 py-2">
          선택 캐릭터 등록
        </button>
      </section>

      <section className="rounded-2xl border p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">등록된 캐릭터 ({characters.length})</h2>
          <button
            onClick={refreshRegisteredCharacters}
            disabled={refreshingRegistered}
            className="border px-4 py-2 disabled:opacity-50"
          >
            {refreshingRegistered ? "갱신 중..." : "등록 캐릭터 정보 갱신"}
          </button>
        </div>

        {characters.length === 0 ? (
          <div className="text-sm text-gray-500">등록된 캐릭터가 아직 없어.</div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {characters.map((c) => (
              <div
                key={c.id}
                className={`border p-4 rounded-xl ${
                  c.gold_exhausted ? "opacity-40" : ""
                }`}
              >
                <div className="font-semibold">{c.character_name}</div>
                <div>{c.class_name}</div>
                <div>역할: {c.role ?? "-"}</div>
                <div>전투력: {formatDecimal(c.combat_power)}</div>
                <div>아이템 레벨: {formatDecimal(c.item_level)}</div>
                <div>주간 골드 획득: {c.weekly_gold_earned_count}/3</div>

                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    onClick={() => toggleGoldCharacter(c.id, c.is_gold_earner)}
                    className="border px-3 py-1"
                  >
                    {c.is_gold_earner ? "골드 캐릭터 해제" : "골드 캐릭터 지정"}
                  </button>
                  <button
                    onClick={() => deleteCharacter(c.id)}
                    className="border px-3 py-1"
                  >
                    삭제
                  </button>
                </div>

                <input
                  className="mt-3 w-full border p-2"
                  placeholder="예정 골드 레이드"
                  defaultValue={c.planned_gold_raid ?? ""}
                  onBlur={(e) => updatePlannedRaid(c.id, e.target.value)}
                />
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">깐부 관리</h2>
          <button onClick={createBuddyAutoParty} className="border px-4 py-2">
            깐부 자동 파티 생성
          </button>
        </div>

        {buddies.length === 0 ? (
          <div className="text-sm text-gray-500">등록된 깐부가 아직 없어.</div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {buddies.map((buddy) => (
              <div key={buddy.buddy_user_id} className="border p-4 rounded-xl">
                <div className="font-semibold">
                  {buddy.display_name ?? buddy.login_id ?? "-"}
                </div>
                <div className="text-sm text-gray-500">
                  ID: {buddy.login_id ?? "-"}
                </div>
                <div className="text-sm text-gray-500">
                  길드: {buddy.guild_name ?? "-"}
                </div>
                <div className="text-sm text-gray-500">
                  추가일: {formatDate(buddy.created_at)}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border p-6 space-y-4">
        <h2 className="text-xl font-semibold">레이드 모집 생성</h2>

        <select
          className="w-full border p-2"
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
          className="w-full border p-2"
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
          className="w-full border p-2"
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
              {row.character_name ?? "-"} / {row.class_name ?? "-"} / {row.role ?? "-"} / 아이템
              레벨 {formatDecimal(row.item_level)}
            </option>
          ))}
        </select>

        {selectedRaidRow ? (
          <div className="rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-700">
            총 인원: {totalMembers}명 / 파티 수: {partyCount}개 / 추가 모집 가능 인원:{" "}
            {recruitableSlots}명
          </div>
        ) : null}

        {selectedDifficultyRow ? (
          <div className="rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-700">
            권장 레벨: {formatDecimal(selectedDifficultyRow.required_item_level)} / 배치 규칙:
            각 파티 1~3번 딜러, 4번 서포터
          </div>
        ) : null}

        {selectedDifficultyRow && eligibleCreatorCharacters.length === 0 ? (
          <div className="text-sm text-red-500">
            이 난이도의 권장 레벨을 충족하는 등록 캐릭터가 없어.
          </div>
        ) : null}

        <div className="rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-700">
          개설 캐릭터는 모집 생성과 동시에 자동 참가 처리돼. 딜러면 1파티 1번, 서포터면
          1파티 4번에 들어가고, 나머지 인원만 추가 모집 가능하게 취급돼.
        </div>

        <input
          className="w-full border p-2"
          type="datetime-local"
          value={raidTime}
          onChange={(e) => setRaidTime(e.target.value)}
        />
        <input
          className="w-full border p-2"
          placeholder="제목"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <textarea
          className="w-full border p-2"
          placeholder="설명"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <button onClick={createRaidPost} className="border px-4 py-2">
          모집 생성
        </button>
      </section>

      <section className="rounded-2xl border p-6 space-y-4">
        <h2 className="text-xl font-semibold">내가 개설한 레이드 모집</h2>
        {myPosts.length === 0 ? (
          <div className="text-sm text-gray-500">내가 만든 모집글이 아직 없어.</div>
        ) : (
          <div className="space-y-4">
            {myPosts.map((post) => (
              <div key={post.id} className="border p-4 rounded-xl">
                <div className="font-semibold">{post.title ?? post.raid_name}</div>
                <div>{post.raid_name}</div>
                <div>난이도: {post.difficulty ?? "-"}</div>
                <div>시간: {formatDate(post.raid_time)}</div>
                <div>총 인원: {post.max_members}</div>
                <div>추가 모집 가능 인원: {Math.max((post.max_members ?? 0) - 1, 0)}</div>
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => forceCreateParty(post.id)}
                    className="border px-3 py-1"
                  >
                    강제 파티 구성
                  </button>
                  <button
                    onClick={() => deleteMyPost(post.id)}
                    className="border px-3 py-1"
                  >
                    모집 삭제
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border p-6 space-y-4">
        <h2 className="text-xl font-semibold">내 신청 목록</h2>
        {myApplications.length === 0 ? (
          <div className="text-sm text-gray-500">신청한 레이드가 아직 없어.</div>
        ) : (
          <div className="space-y-4">
            {myApplications.map((application) => (
              <div key={application.id} className="border p-4 rounded-xl">
                <div>모집 ID: {application.post_id}</div>
                <div>캐릭터 ID: {application.character_id}</div>
                <div>역할: {application.role ?? "-"}</div>
                <div>신청 시각: {formatDate(application.created_at)}</div>
                <button
                  onClick={() => cancelApplication(application.id)}
                  className="mt-2 border px-3 py-1"
                >
                  신청 취소
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}