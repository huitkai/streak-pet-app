"use client";

import type { PetStage, PetMood } from "@/lib/types";
import type { PetSpecies, PetVariant, PetAccessory } from "@/lib/pets";
import PetLottie from "@/components/PetLottie";

/**
 * PetAvatar — điểm vào công khai, giữ NGUYÊN interface cũ để không phải sửa
 * FloatingPet / PetSheet / PetEvolutionCelebration. Bản vẽ SVG cũ đã dời qua
 * PetAvatarFallback.tsx (dùng làm fallback), phần hiển thị chính giờ là
 * PetLottie.tsx (animation Lottie thật).
 */
export default function PetAvatar({
  species,
  stage,
  mood,
  size = 128,
  interactive = true,
  excited = false,
  variant = "radiant",
  accessory = "none",
}: {
  species: PetSpecies;
  stage: PetStage;
  mood: PetMood;
  size?: number;
  interactive?: boolean;
  /** Bật khi streak đạt mốc rất cao (vd tier "legend"/"mythic") — pet nhảy cẫng lên vui mừng thay vì chỉ thở nhẹ. */
  excited?: boolean;
  /** Nhánh tiến hóa — dùng lib/pets.ts#variantForCouple(coupleId, species) để suy ra ổn định. */
  variant?: PetVariant;
  /** Phụ kiện đang đeo. */
  accessory?: PetAccessory;
}) {
  return (
    <PetLottie
      species={species}
      stage={stage}
      mood={mood}
      size={size}
      interactive={interactive}
      excited={excited}
      variant={variant}
      accessory={accessory}
    />
  );
}
