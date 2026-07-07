"use client";

import { useState } from "react";
import type { PetStage, PetMood } from "@/lib/types";
import type { PetSpecies, PetVariant, PetAccessory } from "@/lib/pets";
import { staticImagePath, type LottiePetStage } from "@/lib/pet-lottie";
import PetAvatarFallback from "@/components/PetAvatarFallback";

/**
 * PetStaticImage — tier 2 trong chuỗi fallback (xem PetLottie.tsx):
 * Lottie thật -> PetStaticImage (ảnh PNG AI vẽ, nếu đã có) -> PetAvatarFallback (SVG procedural).
 *
 * File bị thiếu trong package gốc (PetLottie.tsx có import nhưng chưa có file này),
 * bổ sung theo đúng vai trò mô tả trong PET_LOTTIE_SPEC.md #4 và comment trong pet-lottie.ts.
 *
 * Nếu bạn CHƯA vẽ ảnh tĩnh AI cho species/stage này (chưa đặt file tại
 * public/pets/static/{species}/{stage}.png), component tự rớt thẳng về
 * PetAvatarFallback — không cần chờ xử lý gì thêm, không cần xoá component này.
 */
export default function PetStaticImage({
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
  excited?: boolean;
  variant?: PetVariant;
  accessory?: PetAccessory;
}) {
  const [imgFailed, setImgFailed] = useState(false);

  // Egg không có ảnh tĩnh riêng theo spec -> rớt thẳng về SVG fallback.
  if (stage === "egg" || imgFailed) {
    return (
      <PetAvatarFallback
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

  const src = staticImagePath(species, stage as LottiePetStage);

  return (
    // eslint-disable-next-line @next/next/no-img-element -- ảnh tĩnh tuỳ biến theo species/stage động, next/image không cần thiết ở đây
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      style={{ width: size, height: size, objectFit: "contain" }}
      onError={() => setImgFailed(true)}
      draggable={false}
    />
  );
}
