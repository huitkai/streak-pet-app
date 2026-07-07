"use client";

import { useEffect, useRef, useState } from "react";
import { DotLottieReact, type DotLottie } from "@lottiefiles/dotlottie-react";
import type { PetStage, PetMood } from "@/lib/types";
import { STAGE_BODY, isHeadTopper, type PetSpecies, type PetVariant, type PetAccessory } from "@/lib/pets";
import {
  eggLottiePath,
  idleLottiePath,
  legendaryOverlayLottiePath,
  moodToMarker,
  sparkleLottiePath,
  type LottiePetStage,
} from "@/lib/pet-lottie";
import { PetAccessoryLayer } from "@/components/PetAccessoryLayer";
import PetStaticImage from "@/components/PetStaticImage";

/**
 * PetLottie — render pet bằng Lottie (.lottie), thay cho SVG-code cũ.
 *
 * Chiến lược — 3 tier theo thứ tự ưu tiên:
 * 1. Lottie thật (.lottie) — đầy đủ animation theo mood.
 * 2. Ảnh tĩnh AI vẽ (PetStaticImage) — nếu chưa kịp dựng Lottie cho loài/stage
 *    đó nhưng đã có ảnh đẹp, dùng tạm với mood giả lập bằng CSS filter.
 * 3. SVG procedural (PetAvatarFallback, nằm trong PetStaticImage) — lưới an
 *    toàn cuối cùng, luôn có sẵn, không phụ thuộc asset ngoài nào.
 *
 * Mỗi loài/stage có thể ở tier khác nhau tùy bạn đã dựng xong tới đâu —
 * không cần làm xong hết 62 file mới thấy hiệu quả.
 */
export default function PetLottie({
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
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const dotLottieRef = useRef<DotLottie | null>(null);

  const path = stage === "egg" ? eggLottiePath() : idleLottiePath(species, stage as LottiePetStage);
  const marker = stage === "egg" ? undefined : moodToMarker(mood);

  // dotLottieRefCallback chạy lại mỗi khi instance đổi (vd path đổi do species/stage đổi) —
  // gắn listener 'load'/'loadError' ngay tại đây theo đúng API của dotlottie-web.
  function handleInstance(instance: DotLottie | null) {
    dotLottieRef.current = instance;
    if (!instance) return;
    setReady(false);
    setFailed(false);
    instance.addEventListener("load", () => setReady(true));
    instance.addEventListener("loadError", () => setFailed(true));
  }

  // Đổi mood -> nhảy marker trong instance hiện có, không remount
  // (remount sẽ gây giật hình mỗi lần mood đổi, vì phải tải lại buffer).
  useEffect(() => {
    if (!ready || !dotLottieRef.current || !marker) return;
    dotLottieRef.current.setMarker(marker);
    dotLottieRef.current.play();
  }, [marker, ready]);

  function handleTap() {
    if (!interactive || stage === "egg" || !dotLottieRef.current) return;
    dotLottieRef.current.setMarker("petted");
    dotLottieRef.current.play();
    // Sau khi chạy xong đoạn "petted", tự quay lại marker mood hiện tại
    window.setTimeout(() => {
      if (dotLottieRef.current && marker) {
        dotLottieRef.current.setMarker(marker);
        dotLottieRef.current.play();
      }
    }, 750);
  }

  const showAccessory = accessory !== "none" && stage !== "egg" && !(stage === "legendary" && isHeadTopper(accessory));
  const cfg = stage !== "egg" ? STAGE_BODY[stage as Exclude<PetStage, "egg">] : null;

  // Lỗi tải Lottie -> thử tier ảnh tĩnh trước (nếu bạn đã có ảnh AI vẽ cho
  // loài/stage này), PetStaticImage sẽ tự rơi tiếp về SVG nếu ảnh cũng chưa có.
  if (failed) {
    return (
      <PetStaticImage
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

  return (
    <div
      className={`relative select-none ${interactive && stage !== "egg" ? "cursor-pointer active:scale-95" : ""}`}
      style={{ width: size, height: size }}
      onClick={handleTap}
      role={interactive ? "button" : undefined}
      aria-label={interactive ? "Vuốt ve pet" : undefined}
    >
      {/* Trong lúc Lottie chưa sẵn sàng -> thử tier ảnh tĩnh trước, tự rơi
          tiếp về SVG bên trong PetStaticImage nếu ảnh cũng chưa có. */}
      {!ready && (
        <div className="absolute inset-0">
          <PetStaticImage
            species={species}
            stage={stage}
            mood={mood}
            size={size}
            interactive={false}
            excited={excited}
            variant={variant}
            accessory={accessory}
          />
        </div>
      )}

      <div
        className={`absolute inset-0 transition-opacity duration-200 ${ready ? "opacity-100" : "opacity-0"} ${
          excited && mood === "happy" ? "animate-pet-excited" : ""
        }`}
      >
        <DotLottieReact
          key={path}
          src={path}
          loop
          autoplay
          dotLottieRefCallback={handleInstance}
          style={{ width: "100%", height: "100%" }}
        />
      </div>

      {/* Overlay huyền thoại — tách file riêng, tint theo variant qua CSS filter
          thay vì dựng 2 bản màu khác nhau (xem legendaryOverlayTint). */}
      {stage === "legendary" && ready && (
        <div
          className="pointer-events-none absolute inset-0"
          style={{ filter: variant === "mystic" ? "hue-rotate(180deg) saturate(1.3)" : undefined }}
        >
          <DotLottieReact src={legendaryOverlayLottiePath(species)} loop autoplay style={{ width: "100%", height: "100%" }} />
        </div>
      )}

      {showAccessory && cfg && (
        <svg viewBox="0 0 200 200" className="pointer-events-none absolute inset-0 h-full w-full">
          <PetAccessoryLayer accessory={accessory} stage={stage} cfg={cfg} />
        </svg>
      )}
    </div>
  );
}

/** Overlay "sparkle vuốt ve" — 1 file dùng chung toàn app, đặt tuyệt đối lên trên bất kỳ pet nào.
 * Tách export riêng vì đây là hiệu ứng one-shot, không cần đồng bộ state với pet chính. */
export function PetPettedSparkle({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div className="pointer-events-none absolute inset-0">
      <DotLottieReact src={sparkleLottiePath()} autoplay style={{ width: "100%", height: "100%" }} />
    </div>
  );
}
