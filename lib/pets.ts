import type { PetStage } from "@/lib/types";

export type PetSpecies =
  | "cat"
  | "fox"
  | "dragon"
  | "bunny"
  | "panda"
  | "owl"
  | "otter"
  | "penguin"
  | "hamster"
  | "wolf"
  | "unicorn"
  | "koala";

export const SPECIES_LIST: PetSpecies[] = [
  "cat",
  "fox",
  "dragon",
  "bunny",
  "panda",
  "owl",
  "otter",
  "penguin",
  "hamster",
  "wolf",
  "unicorn",
  "koala",
];

export const SPECIES_LABEL: Record<PetSpecies, string> = {
  cat: "Mèo con",
  fox: "Cáo lửa",
  dragon: "Rồng nhí",
  bunny: "Thỏ bông",
  panda: "Gấu trúc",
  owl: "Cú mèo",
  otter: "Rái cá",
  penguin: "Chim cánh cụt",
  hamster: "Hamster má phính",
  wolf: "Sói nhỏ",
  unicorn: "Kỳ lân",
  koala: "Gấu koala",
};

export const SPECIES_DESC: Record<PetSpecies, string> = {
  cat: "Tinh nghịch, hay đòi vuốt ve",
  fox: "Lanh lợi, gắn với chuỗi lửa",
  dragon: "Hiếm, tiến hóa hoành tráng nhất",
  bunny: "Hiền lành, dễ dỗ dành",
  panda: "Chậm rãi, cực kỳ đáng yêu",
  owl: "Tỉnh táo về đêm, thông thái",
  otter: "Hiếu động, thích nắm tay đối phương",
  penguin: "Lạch bạch đáng yêu, trung thành",
  hamster: "Má phính tích trữ, siêu ú nu",
  wolf: "Trung thành, gắn bó bền chặt",
  unicorn: "Huyền diệu, hiếm và lấp lánh",
  koala: "Ôm cây ngủ cả ngày, siêu chill",
};

// Bảng màu chủ đạo cho từng loài — dùng để tô SVG
export const SPECIES_PALETTE: Record<
  PetSpecies,
  { body: string; body2: string; accent: string; cheek: string }
> = {
  cat: { body: "#F4A94C", body2: "#F7C07A", accent: "#7A4B23", cheek: "#FF9EAE" },
  fox: { body: "#F0723A", body2: "#F6A06E", accent: "#5C2A12", cheek: "#FF8FA3" },
  dragon: { body: "#5FBF8F", body2: "#8CD9AE", accent: "#245C3D", cheek: "#FF9EAE" },
  bunny: { body: "#F3E4F7", body2: "#FDF6FF", accent: "#8A5B99", cheek: "#FFB0C4" },
  panda: { body: "#FFFFFF", body2: "#F2F2F2", accent: "#2B2B2B", cheek: "#FF9EAE" },
  owl: { body: "#A9825B", body2: "#D2B48C", accent: "#4A3220", cheek: "#FFB0A3" },
  otter: { body: "#8C5A3C", body2: "#C99A6E", accent: "#402A1C", cheek: "#FF9EAE" },
  penguin: { body: "#2E3440", body2: "#FFFFFF", accent: "#1B1F27", cheek: "#FF9EAE" },
  hamster: { body: "#F2C879", body2: "#FBE3A6", accent: "#7A5A28", cheek: "#FF9EAE" },
  wolf: { body: "#8A97A6", body2: "#C3CBD6", accent: "#333B46", cheek: "#FF9EAE" },
  unicorn: { body: "#FBEBFF", body2: "#FFFFFF", accent: "#B98BD9", cheek: "#FFB0C4" },
  koala: { body: "#B7BBBE", body2: "#E5E7E9", accent: "#4A4E52", cheek: "#FF9EAE" },
};

export const STAGE_LABEL: Record<PetStage, string> = {
  egg: "Trứng",
  baby: "Con non",
  teen: "Thiếu niên",
  adult: "Trưởng thành",
  legendary: "Huyền thoại",
};

export const STAGE_ORDER: PetStage[] = ["egg", "baby", "teen", "adult", "legendary"];

export function stageForStreak(streak: number): PetStage {
  if (streak >= 300) return "legendary";
  if (streak >= 100) return "adult";
  if (streak >= 30) return "teen";
  if (streak >= 8) return "baby";
  return "egg";
}

export function nextStageThreshold(streak: number): number | null {
  const thresholds = [8, 30, 100, 300];
  return thresholds.find((t) => streak < t) ?? null;
}

export function stageProgress(streak: number): number {
  const thresholds = [0, 8, 30, 100, 300];
  const idx = thresholds.findIndex((t) => streak < t);
  if (idx <= 0) return streak >= 300 ? 1 : 0;
  const prev = thresholds[idx - 1];
  const next = thresholds[idx];
  return Math.min(1, (streak - prev) / (next - prev));
}

// ============================================================
// TIẾN HÓA THEO GIAI ĐOẠN — mỗi stage có tỉ lệ thân/đầu/tai/đuôi/mắt
// khác nhau thật sự (không chỉ scale toàn bộ) để pet "lớn lên" rõ ràng.
// ============================================================
export interface StageBodyConfig {
  headR: number;
  bodyRx: number;
  bodyRy: number;
  bodyCy: number;
  earTailScale: number;
  eyeScale: number;
  /** Kích thước "dấu ấn trưởng thành" ở giữa trán — lớn dần rồi được crown thay thế ở legendary. */
  markScale: number;
}

export const STAGE_BODY: Record<Exclude<PetStage, "egg">, StageBodyConfig> = {
  baby: { headR: 50, bodyRx: 38, bodyRy: 28, bodyCy: 122, earTailScale: 0.68, eyeScale: 1.28, markScale: 0 },
  teen: { headR: 45, bodyRx: 50, bodyRy: 38, bodyCy: 126, earTailScale: 0.86, eyeScale: 1.1, markScale: 0.65 },
  adult: { headR: 46, bodyRx: 58, bodyRy: 46, bodyCy: 130, earTailScale: 1, eyeScale: 1, markScale: 1 },
  legendary: { headR: 46, bodyRx: 61, bodyRy: 48, bodyCy: 131, earTailScale: 1.1, eyeScale: 1.05, markScale: 0 },
};

// ============================================================
// RẼ NHÁNH TIẾN HÓA (variant) — từ "teen" trở lên mỗi pet ngả về 1 trong 2
// khí chất, suy ra ổn định từ id cặp đôi + loài (không cần lưu DB thêm).
// ============================================================
export type PetVariant = "radiant" | "mystic";

export const VARIANT_LABEL: Record<PetVariant, string> = {
  radiant: "Nhánh Rực Rỡ",
  mystic: "Nhánh Huyền Bí",
};

export const VARIANT_DESC: Record<PetVariant, string> = {
  radiant: "Ấm áp, tỏa nắng như ngọn lửa nhỏ",
  mystic: "Lấp lánh, huyền ảo như ánh sao đêm",
};

export const VARIANT_ACCENT: Record<
  PetVariant,
  { crown: string; crownStroke: string; aura: string; mark: string; sparkle: string }
> = {
  radiant: { crown: "#F6C445", crownStroke: "#B8860B", aura: "#FFD25E", mark: "#FF9D2E", sparkle: "#FFC94C" },
  mystic: { crown: "#CFE0FF", crownStroke: "#6C7BC9", aura: "#9FE8FF", mark: "#8B7BF0", sparkle: "#B79CFF" },
};

function hashString(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/** Nhánh tiến hóa của 1 pet — ổn định theo từng cặp đôi + loài. */
export function variantForCouple(coupleId: string, species: PetSpecies): PetVariant {
  return hashString(`${coupleId}:${species}`) % 2 === 0 ? "radiant" : "mystic";
}

// ============================================================
// PHỤ KIỆN / SKIN — vài cái mở khóa theo mốc streak, vài cái theo mùa.
// ============================================================
export type PetAccessory =
  | "none"
  | "bowtie"
  | "sunglasses"
  | "flower_crown"
  | "love_headband"
  | "wizard_hat"
  | "santa_hat"
  | "pumpkin_hat";

export const ACCESSORY_LIST: PetAccessory[] = [
  "none",
  "bowtie",
  "sunglasses",
  "flower_crown",
  "love_headband",
  "wizard_hat",
  "santa_hat",
  "pumpkin_hat",
];

export const ACCESSORY_LABEL: Record<PetAccessory, string> = {
  none: "Không đeo gì",
  bowtie: "Nơ cổ",
  sunglasses: "Kính mát",
  flower_crown: "Vòng hoa",
  love_headband: "Băng đô trái tim",
  wizard_hat: "Nón phù thủy",
  santa_hat: "Nón Giáng sinh",
  pumpkin_hat: "Nón bí ngô",
};

/** Phụ kiện "trùm đầu" — nhường chỗ cho vương miện khi pet đã là legendary. */
const HEAD_TOPPER: PetAccessory[] = ["flower_crown", "wizard_hat", "santa_hat", "pumpkin_hat"];
export function isHeadTopper(id: PetAccessory): boolean {
  return HEAD_TOPPER.includes(id);
}

/** Mốc streak cần để mở khóa (0 = mở sẵn). Không áp dụng cho phụ kiện theo mùa. */
const ACCESSORY_STREAK_REQUIREMENT: Record<PetAccessory, number> = {
  none: 0,
  bowtie: 0,
  sunglasses: 7,
  flower_crown: 30,
  love_headband: 50,
  wizard_hat: 100,
  santa_hat: 0,
  pumpkin_hat: 0,
};

/** Phụ kiện theo mùa chỉ hiện được trong 1 khoảng tháng nhất định trong năm. */
const ACCESSORY_SEASON_MONTH: Partial<Record<PetAccessory, number[]>> = {
  santa_hat: [12, 1],
  pumpkin_hat: [10],
};

export function accessoryUnlockStreak(id: PetAccessory): number {
  return ACCESSORY_STREAK_REQUIREMENT[id] ?? 0;
}

export function isAccessorySeasonal(id: PetAccessory): boolean {
  return !!ACCESSORY_SEASON_MONTH[id];
}

export function isAccessoryInSeason(id: PetAccessory, date: Date = new Date()): boolean {
  const months = ACCESSORY_SEASON_MONTH[id];
  if (!months) return true;
  return months.includes(date.getMonth() + 1);
}

export function isAccessoryUnlocked(id: PetAccessory, streak: number, date: Date = new Date()): boolean {
  if (id === "none") return true;
  if (isAccessorySeasonal(id)) return isAccessoryInSeason(id, date);
  return streak >= accessoryUnlockStreak(id);
}
