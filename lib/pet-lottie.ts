import type { PetStage } from "@/lib/types";
import type { PetSpecies, PetVariant } from "@/lib/pets";

/**
 * Đường dẫn asset Lottie — xem chi tiết cấu trúc & lý do tinh giản tại
 * docs/PET_LOTTIE_SPEC.md. Mỗi file "idle" chứa sẵn 4 marker mood +
 * 1 marker "petted", nên KHÔNG có hàm riêng cho mood — chỉ có 1 path/loài/stage.
 */

export type LottiePetStage = Exclude<PetStage, "egg">;

export const PET_LOTTIE_MARKERS = {
  idleHappy: "idle_happy",
  idleNeutral: "idle_neutral",
  idleSad: "idle_sad",
  idleSick: "idle_sick",
  petted: "petted",
} as const;

export function moodToMarker(mood: "happy" | "neutral" | "sad" | "sick"): string {
  switch (mood) {
    case "happy":
      return PET_LOTTIE_MARKERS.idleHappy;
    case "sad":
      return PET_LOTTIE_MARKERS.idleSad;
    case "sick":
      return PET_LOTTIE_MARKERS.idleSick;
    default:
      return PET_LOTTIE_MARKERS.idleNeutral;
  }
}

export function eggLottiePath(): string {
  return "/pets/lottie/_shared/egg.lottie";
}

export function sparkleLottiePath(): string {
  return "/pets/lottie/_shared/sparkle-pet.lottie";
}

export function idleLottiePath(species: PetSpecies, stage: LottiePetStage): string {
  return `/pets/lottie/${species}/${stage}.lottie`;
}

/**
 * Tier trung gian: ảnh tĩnh (PNG/WebP do AI vẽ, CHƯA vector hóa/animate).
 * Dùng khi bạn đã có ảnh đẹp nhưng chưa kịp dựng Lottie — ưu tiên thấp hơn
 * Lottie, cao hơn SVG procedural. Đặt file tại đúng path này là dùng được
 * ngay, không cần sửa code (xem PetStaticImage.tsx).
 */
export function staticImagePath(species: PetSpecies, stage: LottiePetStage): string {
  return `/pets/static/${species}/${stage}.png`;
}

export function legendaryOverlayLottiePath(species: PetSpecies): string {
  return `/pets/lottie/${species}/legendary-overlay.lottie`;
}

/** Màu tint cho overlay legendary theo nhánh tiến hóa — áp bằng color-slot của dotLottie
 * (xem PetLottie.tsx) thay vì dựng 2 file riêng radiant/mystic. */
export function legendaryOverlayTint(variant: PetVariant): { aura: string; crown: string } {
  return variant === "radiant"
    ? { aura: "#FFD25E", crown: "#F6C445" }
    : { aura: "#9FE8FF", crown: "#CFE0FF" };
}

/**
 * Gom mọi path cần cho 1 pet cụ thể (species+stage hiện tại của user) —
 * dùng để preload ĐÚNG những gì cần hiển thị ngay, không tải cả 12 loài.
 * Gọi hàm này trong ChatHeader/page khi đã biết species+stage của couple.
 */
export function pathsToPreload(species: PetSpecies, stage: PetStage): string[] {
  if (stage === "egg") return [eggLottiePath()];
  const paths = [idleLottiePath(species, stage), sparkleLottiePath()];
  if (stage === "legendary") paths.push(legendaryOverlayLottiePath(species));
  return paths;
}

/** Preload bằng cách bơm <link rel="prefetch"> — tận dụng cache HTTP của browser,
 * không cần giữ instance dotLottie nào trong bộ nhớ trước khi thực sự render. */
export function preloadPetLottie(species: PetSpecies, stage: PetStage) {
  if (typeof document === "undefined") return;
  for (const href of pathsToPreload(species, stage)) {
    if (document.querySelector(`link[href="${href}"]`)) continue;
    const link = document.createElement("link");
    link.rel = "prefetch";
    link.as = "fetch";
    link.href = href;
    document.head.appendChild(link);
  }
}
