export type CharacterRoleType = "dps" | "support";

export type SynergyCode =
  | "armor_reduction"
  | "damage_amplify"
  | "front_back_damage_amplify"
  | "damage_taken_reduction"
  | "crit_damage"
  | "attack_power"
  | "crit_rate"
  | "attack_power_reduction";

export type EngravingMeta = {
  shortName: string;
  fullName: string;
  role: CharacterRoleType;
  synergyCodes: SynergyCode[];
};

const SYNERGY_LABELS: Record<SynergyCode, string> = {
  armor_reduction: "방깎",
  damage_amplify: "피증",
  front_back_damage_amplify: "백헤드 피증",
  damage_taken_reduction: "받피감",
  crit_damage: "치피증",
  attack_power: "공증",
  crit_rate: "치적",
  attack_power_reduction: "공깎",
};

const ENGRAVING_META_LIST: EngravingMeta[] = [
  { shortName: "분망", fullName: "분노의 망치", role: "dps", synergyCodes: ["armor_reduction"] },
  { shortName: "중수", fullName: "중력 수련", role: "dps", synergyCodes: ["armor_reduction"] },
  { shortName: "전태", fullName: "전투 태세", role: "dps", synergyCodes: ["armor_reduction", "front_back_damage_amplify", "damage_taken_reduction"] },
  { shortName: "화강", fullName: "화력 강화", role: "dps", synergyCodes: ["armor_reduction"] },
  { shortName: "포강", fullName: "포격 강화", role: "dps", synergyCodes: ["armor_reduction"] },
  { shortName: "용맹", fullName: "진실된 용맹", role: "dps", synergyCodes: ["armor_reduction", "attack_power_reduction"] },
  { shortName: "교감", fullName: "넘치는 교감", role: "dps", synergyCodes: ["armor_reduction"] },
  { shortName: "상소", fullName: "상급 소환사", role: "dps", synergyCodes: ["armor_reduction"] },
  { shortName: "달소", fullName: "달의 소리", role: "dps", synergyCodes: ["armor_reduction"] },
  { shortName: "갈증", fullName: "갈증", role: "dps", synergyCodes: ["armor_reduction"] },
  { shortName: "회귀", fullName: "회귀", role: "support", synergyCodes: ["armor_reduction", "damage_taken_reduction"] },
  { shortName: "환수각성", fullName: "환수 각성", role: "dps", synergyCodes: ["armor_reduction"] },
  { shortName: "야성", fullName: "야성", role: "dps", synergyCodes: ["armor_reduction"] },

  { shortName: "광기", fullName: "광기", role: "dps", synergyCodes: ["damage_amplify"] },
  { shortName: "비기", fullName: "광전사의 비기", role: "dps", synergyCodes: ["damage_amplify"] },
  { shortName: "처단", fullName: "처단자", role: "dps", synergyCodes: ["damage_amplify"] },
  { shortName: "포식", fullName: "포식자", role: "dps", synergyCodes: ["damage_amplify"] },
  { shortName: "체술", fullName: "극의: 체술", role: "dps", synergyCodes: ["damage_amplify"] },
  { shortName: "충단", fullName: "충격 단련", role: "dps", synergyCodes: ["damage_amplify"] },
  { shortName: "수라", fullName: "수라의 길", role: "dps", synergyCodes: ["damage_amplify"] },
  { shortName: "권왕", fullName: "권왕파천무", role: "dps", synergyCodes: ["damage_amplify"] },
  { shortName: "두동", fullName: "두 번째 동료", role: "dps", synergyCodes: ["damage_amplify"] },
  { shortName: "죽습", fullName: "죽음의 습격", role: "dps", synergyCodes: ["damage_amplify"] },
  { shortName: "점화", fullName: "점화", role: "dps", synergyCodes: ["damage_amplify"] },
  { shortName: "환류", fullName: "환류", role: "dps", synergyCodes: ["damage_amplify"] },
  { shortName: "억제", fullName: "완벽한 억제", role: "dps", synergyCodes: ["damage_amplify"] },
  { shortName: "충동", fullName: "멈출 수 없는 충동", role: "dps", synergyCodes: ["damage_amplify"] },
  { shortName: "그믐", fullName: "그믐의 경계", role: "dps", synergyCodes: ["damage_amplify"] },
  { shortName: "만월", fullName: "만월의 집행자", role: "dps", synergyCodes: ["damage_amplify"] },
  { shortName: "드레드로어", fullName: "드레드로어", role: "dps", synergyCodes: ["damage_amplify"] },
  { shortName: "업화", fullName: "업화의 계승자", role: "dps", synergyCodes: ["damage_amplify"] },
  { shortName: "고기", fullName: "고독한 기사", role: "dps", synergyCodes: ["front_back_damage_amplify", "damage_taken_reduction"] },
  { shortName: "잔재", fullName: "잔재된 기운", role: "dps", synergyCodes: ["front_back_damage_amplify"] },
  { shortName: "버스트", fullName: "버스트", role: "dps", synergyCodes: ["front_back_damage_amplify"] },

  { shortName: "심판자", fullName: "심판자", role: "dps", synergyCodes: ["crit_damage"] },

  { shortName: "빛의 기사", fullName: "빛의 기사", role: "dps", synergyCodes: ["crit_damage"] },
  { shortName: "절제", fullName: "절제", role: "dps", synergyCodes: ["crit_damage"] },
  { shortName: "절정", fullName: "절정", role: "dps", synergyCodes: ["crit_damage"] },

  { shortName: "역천", fullName: "역천지체", role: "dps", synergyCodes: ["attack_power"] },
  { shortName: "세맥", fullName: "세맥타통", role: "dps", synergyCodes: ["attack_power"] },

  { shortName: "오의", fullName: "오의 강화", role: "dps", synergyCodes: ["crit_rate"] },
  { shortName: "초심", fullName: "초심", role: "dps", synergyCodes: ["crit_rate"] },
  { shortName: "난무", fullName: "오의 난무", role: "dps", synergyCodes: ["crit_rate"] },
  { shortName: "일격", fullName: "일격필살", role: "dps", synergyCodes: ["crit_rate"] },
  { shortName: "강무", fullName: "강화 무기", role: "dps", synergyCodes: ["crit_rate"] },
  { shortName: "핸건", fullName: "핸드거너", role: "dps", synergyCodes: ["crit_rate"] },
  { shortName: "사시", fullName: "사냥의 시간", role: "dps", synergyCodes: ["crit_rate"] },
  { shortName: "피매", fullName: "피스메이커", role: "dps", synergyCodes: ["crit_rate"] },
  { shortName: "황후", fullName: "황후의 은총", role: "dps", synergyCodes: ["crit_rate"] },
  { shortName: "황제", fullName: "황제의 칙령", role: "dps", synergyCodes: ["crit_rate"] },
  { shortName: "이슬비", fullName: "이슬비", role: "dps", synergyCodes: ["crit_rate", "attack_power_reduction"] },
  { shortName: "질풍", fullName: "질풍노도", role: "dps", synergyCodes: ["crit_rate"] },

  { shortName: "절구", fullName: "절실한 구원", role: "support", synergyCodes: [] },
  { shortName: "절실한 구원", fullName: "절실한 구원", role: "support", synergyCodes: [] },
  { shortName: "축오", fullName: "축복의 오라", role: "support", synergyCodes: [] },
  { shortName: "축복의 오라", fullName: "축복의 오라", role: "support", synergyCodes: [] },
  { shortName: "해방자", fullName: "해방자", role: "support", synergyCodes: [] },
];

const ENGRAVING_META_MAP = new Map<string, EngravingMeta>();

function normalizeText(value: string | null | undefined) {
  return (value ?? "").replace(/\s+/g, "").trim().toLowerCase();
}

for (const meta of ENGRAVING_META_LIST) {
  ENGRAVING_META_MAP.set(normalizeText(meta.shortName), meta);
  ENGRAVING_META_MAP.set(normalizeText(meta.fullName), meta);
}

export function getSynergyLabelFromCode(code: SynergyCode) {
  return SYNERGY_LABELS[code];
}

export function getSynergyLabelsFromCodes(codes: SynergyCode[]) {
  return codes.map((code) => SYNERGY_LABELS[code]);
}

export function resolveEngravingMeta(
  className: string | null | undefined,
  engravingName: string | null | undefined
): EngravingMeta | null {
  const normalizedEngraving = normalizeText(engravingName);
  const normalizedClass = normalizeText(className);

  if (normalizedEngraving && ENGRAVING_META_MAP.has(normalizedEngraving)) {
    return ENGRAVING_META_MAP.get(normalizedEngraving) ?? null;
  }

  if (
    normalizedClass === normalizeText("가디언나이트") ||
    normalizedClass === normalizeText("guardianknight")
  ) {
    return {
      shortName: engravingName?.trim() || "가디언나이트",
      fullName: engravingName?.trim() || "가디언나이트",
      role: "dps",
      synergyCodes: ["damage_amplify"],
    };
  }

  return null;
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