export type CharacterRoleType = "dps" | "support";

export type SynergyCode =
  | "armor_reduction" // 방깎
  | "stagger" // 무력화
  | "damage_amplify" // 피증
  | "damage_taken_reduction" // 받피감
  | "attack_power_reduction" // 공깎
  | "front_back_damage_amplify" // 백헤드피증
  | "crit_damage" // 치피증
  | "crit_rate" // 치적
  | "attack_move_speed" // 공이속
  | "move_speed" // 이속
  | "mana_recovery" // 마회
  | "damage_reduction" // 뎀감
  | "attack_speed" // 공속
  | "attack_power"; // 공증

export type EngravingMeta = {
  className: string;
  shortName: string;
  fullName: string;
  aliases: string[];
  role: CharacterRoleType;
  synergyCodes: SynergyCode[];
};

const SYNERGY_LABELS: Record<SynergyCode, string> = {
  armor_reduction: "방깎",
  stagger: "무력화",
  damage_amplify: "피증",
  damage_taken_reduction: "받피감",
  attack_power_reduction: "공깎",
  front_back_damage_amplify: "백헤드피증",
  crit_damage: "치피증",
  crit_rate: "치적",
  attack_move_speed: "공이속",
  move_speed: "이속",
  mana_recovery: "마회",
  damage_reduction: "뎀감",
  attack_speed: "공속",
  attack_power: "공증",
};

function normalizeText(value: string | null | undefined) {
  return (value ?? "")
    .replace(/[()\[\]{}:·.,/\\\-_\s]/g, "")
    .trim()
    .toLowerCase();
}

const ENGRAVING_META_LIST: EngravingMeta[] = [
  {
    className: "버서커",
    shortName: "비기",
    fullName: "광전사의 비기",
    aliases: ["광전사의비기"],
    role: "dps",
    synergyCodes: ["damage_amplify"],
  },
  {
    className: "버서커",
    shortName: "광기",
    fullName: "광기",
    aliases: [],
    role: "dps",
    synergyCodes: ["damage_amplify"],
  },

  {
    className: "디스트로이어",
    shortName: "분망",
    fullName: "분노의 망치",
    aliases: ["분노의망치"],
    role: "dps",
    synergyCodes: ["armor_reduction", "stagger"],
  },
  {
    className: "디스트로이어",
    shortName: "중수",
    fullName: "중력 수련",
    aliases: ["중력수련"],
    role: "dps",
    synergyCodes: ["armor_reduction", "stagger"],
  },

  {
    className: "워로드",
    shortName: "고기",
    fullName: "고독한 기사",
    aliases: ["고독한기사"],
    role: "dps",
    synergyCodes: ["front_back_damage_amplify", "damage_taken_reduction"],
  },
  {
    className: "워로드",
    shortName: "전태",
    fullName: "전투 태세",
    aliases: ["전투태세"],
    role: "dps",
    synergyCodes: [
      "armor_reduction",
      "front_back_damage_amplify",
      "damage_taken_reduction",
    ],
  },

  {
    className: "홀리나이트",
    shortName: "심판자",
    fullName: "심판자",
    aliases: [],
    role: "dps",
    synergyCodes: ["crit_damage"],
  },
  {
    className: "홀리나이트",
    shortName: "축오",
    fullName: "축복의 오라",
    aliases: ["축복의오라"],
    role: "support",
    synergyCodes: [],
  },

  {
    className: "슬래이어",
    shortName: "처단",
    fullName: "처단자",
    aliases: [],
    role: "dps",
    synergyCodes: ["damage_amplify"],
  },
  {
    className: "슬래이어",
    shortName: "포식",
    fullName: "포식자",
    aliases: [],
    role: "dps",
    synergyCodes: ["damage_amplify"],
  },

  {
    className: "발키리",
    shortName: "빛의 기사",
    fullName: "빛의 기사",
    aliases: ["빛의기사"],
    role: "dps",
    synergyCodes: ["crit_damage"],
  },
  {
    className: "발키리",
    shortName: "해방자",
    fullName: "해방자",
    aliases: [],
    role: "support",
    synergyCodes: [],
  },

  {
    className: "배틀마스터",
    shortName: "초심",
    fullName: "초심",
    aliases: [],
    role: "dps",
    synergyCodes: ["crit_rate", "attack_move_speed"],
  },
  {
    className: "배틀마스터",
    shortName: "오의",
    fullName: "오의 강화",
    aliases: ["오의강화"],
    role: "dps",
    synergyCodes: ["crit_rate", "attack_move_speed"],
  },

  {
    className: "인파이터",
    shortName: "체술",
    fullName: "극의: 체술",
    aliases: ["극의체술"],
    role: "dps",
    synergyCodes: ["damage_amplify", "stagger"],
  },
  {
    className: "인파이터",
    shortName: "충단",
    fullName: "충격 단련",
    aliases: ["충격단련"],
    role: "dps",
    synergyCodes: ["damage_amplify", "stagger"],
  },

  {
    className: "기공사",
    shortName: "역천",
    fullName: "역천지체",
    aliases: [],
    role: "dps",
    synergyCodes: ["attack_power", "damage_taken_reduction"],
  },
  {
    className: "기공사",
    shortName: "세맥",
    fullName: "세맥타통",
    aliases: [],
    role: "dps",
    synergyCodes: ["attack_power", "damage_taken_reduction"],
  },

  {
    className: "창술사",
    shortName: "절정",
    fullName: "절정",
    aliases: [],
    role: "dps",
    synergyCodes: ["crit_damage"],
  },
  {
    className: "창술사",
    shortName: "절제",
    fullName: "절제",
    aliases: [],
    role: "dps",
    synergyCodes: ["crit_damage"],
  },

  {
    className: "브레이커",
    shortName: "권왕",
    fullName: "권왕파천무",
    aliases: [],
    role: "dps",
    synergyCodes: ["damage_amplify"],
  },
  {
    className: "브레이커",
    shortName: "수라",
    fullName: "수라의 길",
    aliases: ["수라의길"],
    role: "dps",
    synergyCodes: ["damage_amplify"],
  },

  {
    className: "스트라이커",
    shortName: "난무",
    fullName: "오의난무",
    aliases: ["오의 난무"],
    role: "dps",
    synergyCodes: ["crit_rate", "attack_speed"],
  },
  {
    className: "스트라이커",
    shortName: "일격",
    fullName: "일격필살",
    aliases: [],
    role: "dps",
    synergyCodes: ["crit_rate", "attack_speed"],
  },

  {
    className: "데빌헌터",
    shortName: "전탄",
    fullName: "전술 탄환",
    aliases: ["전술탄환"],
    role: "dps",
    synergyCodes: ["crit_rate"],
  },
  {
    className: "데빌헌터",
    shortName: "핸건",
    fullName: "핸드거너",
    aliases: [],
    role: "dps",
    synergyCodes: ["crit_rate"],
  },

  {
    className: "호크아이",
    shortName: "죽습",
    fullName: "죽음의 습격",
    aliases: ["죽음의습격"],
    role: "dps",
    synergyCodes: ["damage_amplify"],
  },
  {
    className: "호크아이",
    shortName: "두동",
    fullName: "두 번째 동료",
    aliases: ["두번째동료", "두 번째동료"],
    role: "dps",
    synergyCodes: ["damage_amplify", "move_speed", "attack_power_reduction"],
  },

  {
    className: "블래스터",
    shortName: "화강",
    fullName: "화력 강화",
    aliases: ["화력강화"],
    role: "dps",
    synergyCodes: ["armor_reduction", "stagger"],
  },
  {
    className: "블래스터",
    shortName: "포강",
    fullName: "포격 강화",
    aliases: ["포격강화"],
    role: "dps",
    synergyCodes: ["armor_reduction", "stagger"],
  },

  {
    className: "스카우터",
    shortName: "기술",
    fullName: "아르데타인의 기술",
    aliases: ["아르데타인의기술"],
    role: "dps",
    synergyCodes: ["attack_power"],
  },
  {
    className: "스카우터",
    shortName: "유산",
    fullName: "진화의 유산",
    aliases: ["진화의유산"],
    role: "dps",
    synergyCodes: ["attack_power"],
  },

  {
    className: "건슬링어",
    shortName: "피메",
    fullName: "피스메이커",
    aliases: ["피매", "피스 메이커"],
    role: "dps",
    synergyCodes: ["crit_rate"],
  },
  {
    className: "건슬링어",
    shortName: "사시",
    fullName: "사냥의 시간",
    aliases: ["사냥의시간"],
    role: "dps",
    synergyCodes: ["crit_rate"],
  },

  {
    className: "바드",
    shortName: "절구",
    fullName: "절실한 구원",
    aliases: ["절실한구원"],
    role: "support",
    synergyCodes: [],
  },
  {
    className: "바드",
    shortName: "용맹",
    fullName: "진실된 용맹",
    aliases: ["진실된용맹"],
    role: "dps",
    synergyCodes: [
      "armor_reduction",
      "attack_speed",
      "attack_power_reduction",
      "mana_recovery",
      "damage_reduction",
    ],
  },

  {
    className: "서머너",
    shortName: "상소",
    fullName: "상급 소환사",
    aliases: ["상급소환사"],
    role: "dps",
    synergyCodes: ["armor_reduction", "mana_recovery"],
  },
  {
    className: "서머너",
    shortName: "교감",
    fullName: "넘치는 교감",
    aliases: ["넘치는교감"],
    role: "dps",
    synergyCodes: ["armor_reduction", "mana_recovery"],
  },

  {
    className: "아르카나",
    shortName: "황후",
    fullName: "황후의 은총",
    aliases: ["황후의은총"],
    role: "dps",
    synergyCodes: ["damage_amplify"],
  },
  {
    className: "아르카나",
    shortName: "황제",
    fullName: "황제의 칙령",
    aliases: ["황제의칙령"],
    role: "dps",
    synergyCodes: ["damage_amplify"],
  },

  {
    className: "소서리스",
    shortName: "점화",
    fullName: "점화",
    aliases: [],
    role: "dps",
    synergyCodes: ["crit_rate"],
  },
  {
    className: "소서리스",
    shortName: "환류",
    fullName: "환류",
    aliases: [],
    role: "dps",
    synergyCodes: ["crit_rate"],
  },

  {
    className: "데모닉",
    shortName: "충동",
    fullName: "멈출 수 없는 충동",
    aliases: ["멈출수없는충동"],
    role: "dps",
    synergyCodes: ["damage_amplify"],
  },
  {
    className: "데모닉",
    shortName: "억제",
    fullName: "완벽한 억제",
    aliases: ["완벽한억제"],
    role: "dps",
    synergyCodes: ["damage_amplify"],
  },

  {
    className: "블레이드",
    shortName: "잔재",
    fullName: "잔재된 기운",
    aliases: ["잔재된기운"],
    role: "dps",
    synergyCodes: ["front_back_damage_amplify", "attack_move_speed"],
  },
  {
    className: "블레이드",
    shortName: "버스트",
    fullName: "버스트 강화",
    aliases: ["버스트강화"],
    role: "dps",
    synergyCodes: ["front_back_damage_amplify", "attack_move_speed"],
  },

  {
    className: "리퍼",
    shortName: "달소",
    fullName: "달의 소리",
    aliases: ["달의소리"],
    role: "dps",
    synergyCodes: ["armor_reduction"],
  },
  {
    className: "리퍼",
    shortName: "갈증",
    fullName: "갈증",
    aliases: [],
    role: "dps",
    synergyCodes: ["armor_reduction"],
  },

  {
    className: "소울이터",
    shortName: "만월",
    fullName: "만월의 집행자",
    aliases: ["만월의집행자"],
    role: "dps",
    synergyCodes: ["damage_amplify"],
  },
  {
    className: "소울이터",
    shortName: "그믐",
    fullName: "그믐의 경계",
    aliases: ["그믐의경계"],
    role: "dps",
    synergyCodes: ["damage_amplify"],
  },

  {
    className: "도화가",
    shortName: "만개",
    fullName: "만개",
    aliases: [],
    role: "support",
    synergyCodes: [],
  },
  {
    className: "도화가",
    shortName: "회귀",
    fullName: "회귀",
    aliases: [],
    role: "dps",
    synergyCodes: ["armor_reduction", "damage_taken_reduction", "attack_speed"],
  },

  {
    className: "기상술사",
    shortName: "질풍",
    fullName: "질풍노도",
    aliases: [],
    role: "dps",
    synergyCodes: ["crit_rate", "attack_move_speed"],
  },
  {
    className: "기상술사",
    shortName: "이슬비",
    fullName: "이슬비",
    aliases: [],
    role: "dps",
    synergyCodes: ["crit_rate", "attack_power_reduction"],
  },

  {
    className: "환수사",
    shortName: "야성",
    fullName: "야성",
    aliases: [],
    role: "dps",
    synergyCodes: ["armor_reduction"],
  },
  {
    className: "환수사",
    shortName: "각성",
    fullName: "환수 각성",
    aliases: ["환수각성"],
    role: "dps",
    synergyCodes: ["armor_reduction"],
  },

  {
    className: "가디언나이트",
    shortName: "업화",
    fullName: "업화의 계승자",
    aliases: ["업화의계승자"],
    role: "dps",
    synergyCodes: ["damage_amplify"],
  },
  {
    className: "가디언나이트",
    shortName: "로어",
    fullName: "드레드 로어",
    aliases: ["드레드로어"],
    role: "dps",
    synergyCodes: ["damage_amplify"],
  },
];

const ENGRAVING_META_MAP = new Map<string, EngravingMeta>();

for (const meta of ENGRAVING_META_LIST) {
  for (const alias of [meta.shortName, meta.fullName, ...meta.aliases]) {
    ENGRAVING_META_MAP.set(normalizeText(alias), meta);
  }
}

export function getSynergyLabelsFromCodes(codes: SynergyCode[]) {
  return codes.map((code) => SYNERGY_LABELS[code]);
}

export function getKnownClassEngravingOptions(className: string | null | undefined) {
  const normalizedClass = normalizeText(className);

  const rows = ENGRAVING_META_LIST.filter(
    (row) => normalizeText(row.className) === normalizedClass
  );

  const seen = new Set<string>();

  return rows
    .map((row) => ({
      value: row.fullName,
      label: `${row.fullName} (${row.shortName})${
        row.role === "support" ? " / 서포터" : ""
      }`,
    }))
    .filter((row) => {
      const key = normalizeText(row.value);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function fuzzyFindEngravingMeta(engravingName: string | null | undefined): EngravingMeta | null {
  const normalizedInput = normalizeText(engravingName);
  if (!normalizedInput) return null;

  if (ENGRAVING_META_MAP.has(normalizedInput)) {
    return ENGRAVING_META_MAP.get(normalizedInput) ?? null;
  }

  for (const meta of ENGRAVING_META_LIST) {
    const candidates = [meta.shortName, meta.fullName, ...meta.aliases].map(normalizeText);

    for (const candidate of candidates) {
      if (
        candidate.includes(normalizedInput) ||
        normalizedInput.includes(candidate)
      ) {
        return meta;
      }
    }
  }

  return null;
}

export function resolveEngravingMeta(
  className: string | null | undefined,
  engravingName: string | null | undefined
): EngravingMeta | null {
  const normalizedClass = normalizeText(className);
  const matched = fuzzyFindEngravingMeta(engravingName);

  if (!matched) return null;
  if (!normalizedClass) return matched;
  if (normalizeText(matched.className) === normalizedClass) return matched;

  const classRows = ENGRAVING_META_LIST.filter(
    (row) => normalizeText(row.className) === normalizedClass
  );

  const normalizedInput = normalizeText(engravingName);

  for (const row of classRows) {
    const candidates = [row.shortName, row.fullName, ...row.aliases].map(normalizeText);
    for (const candidate of candidates) {
      if (
        candidate.includes(normalizedInput) ||
        normalizedInput.includes(candidate)
      ) {
        return row;
      }
    }
  }

  return matched;
}

export function inferRoleFromClassEngraving(
  className: string | null | undefined,
  engravingName: string | null | undefined,
  fallbackRole?: string | null
): CharacterRoleType {
  const meta = resolveEngravingMeta(className, engravingName);
  if (meta) return meta.role;
  return fallbackRole === "support" ? "support" : "dps";
}

export function inferSynergyCodesFromClassEngraving(
  className: string | null | undefined,
  engravingName: string | null | undefined
): SynergyCode[] {
  const meta = resolveEngravingMeta(className, engravingName);
  return meta?.synergyCodes ?? [];
}

export function inferSynergyLabelsFromClassEngraving(
  className: string | null | undefined,
  engravingName: string | null | undefined
): string[] {
  return getSynergyLabelsFromCodes(
    inferSynergyCodesFromClassEngraving(className, engravingName)
  );
}

export function formatRoleLabel(role: string | null | undefined) {
  return role === "support" ? "💚 서포터" : "딜러";
}