// Giữ file này để tương thích ngược — logic thật nằm ở lib/pets.ts
export {
  stageForStreak,
  nextStageThreshold,
  stageProgress,
  STAGE_LABEL,
  STAGE_ORDER,
  STAGE_BODY,
  variantForCouple,
  VARIANT_LABEL,
  VARIANT_DESC,
  VARIANT_ACCENT,
  ACCESSORY_LIST,
  ACCESSORY_LABEL,
  isHeadTopper,
  accessoryUnlockStreak,
  isAccessorySeasonal,
  isAccessoryInSeason,
  isAccessoryUnlocked,
} from "@/lib/pets";
export type { PetSpecies, PetVariant, PetAccessory, StageBodyConfig } from "@/lib/pets";

export const MOOD_LABEL: Record<string, string> = {
  happy: "Vui vẻ",
  neutral: "Bình thường",
  sad: "Buồn",
  sick: "Ốm yếu",
};
