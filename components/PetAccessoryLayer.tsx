import type { PetStage } from "@/lib/types";
import type { PetAccessory } from "@/lib/pets";

/**
 * Lớp phụ kiện — vẽ độc lập với loài, đặt lên trên hình pet (SVG fallback
 * HOẶC Lottie, xem PetLottie.tsx). Tách riêng khỏi PetAvatarFallback để
 * dùng chung 1 chỗ, không lệch nhau khi style pet đổi.
 *
 * `cfg` chỉ cần headR + eyeScale để neo đúng vị trí trên đầu — khớp với
 * STAGE_BODY của cả 2 hệ render (SVG cũ lẫn canvas 200x200 của Lottie mới).
 */
export function PetAccessoryLayer({
  accessory,
  stage,
  cfg,
}: {
  accessory: PetAccessory;
  stage: Exclude<PetStage, "egg">;
  cfg: { headR: number; eyeScale: number };
}) {
  const headTop = 90 - cfg.headR;

  switch (accessory) {
    case "bowtie":
      return (
        <g transform={`translate(100 ${132 + (1 - cfg.eyeScale) * -6})`}>
          <path d="M-14 0 L-2 -7 L-2 7 Z" fill="#E8341C" stroke="#8f1c0d" strokeWidth="1" />
          <path d="M14 0 L2 -7 L2 7 Z" fill="#E8341C" stroke="#8f1c0d" strokeWidth="1" />
          <circle cx="0" cy="0" r="3.2" fill="#FFD25E" />
        </g>
      );
    case "sunglasses":
      return (
        <g transform={`translate(100 90) scale(${cfg.eyeScale}) translate(-100 -90)`}>
          <rect x="60" y="84" width="24" height="13" rx="5" fill="#1B1F27" opacity="0.92" />
          <rect x="116" y="84" width="24" height="13" rx="5" fill="#1B1F27" opacity="0.92" />
          <path d="M84 88 L116 88" stroke="#1B1F27" strokeWidth="3" />
          <ellipse cx="68" cy="88" rx="5" ry="2.6" fill="#fff" opacity="0.35" />
          <ellipse cx="124" cy="88" rx="5" ry="2.6" fill="#fff" opacity="0.35" />
        </g>
      );
    case "flower_crown":
      return (
        <g>
          {[-28, -14, 0, 14, 28].map((dx) => (
            <g key={dx} transform={`translate(${100 + dx} ${headTop + 8 + Math.abs(dx) * 0.12})`}>
              <circle r="5" fill="#FF9EC4" />
              <circle cx="-4" cy="-3" r="3.4" fill="#FFC1DE" />
              <circle cx="4" cy="-3" r="3.4" fill="#FFC1DE" />
              <circle cx="0" cy="-5" r="3.4" fill="#FFE0EE" />
              <circle r="1.8" fill="#FFD25E" />
            </g>
          ))}
        </g>
      );
    case "love_headband":
      return (
        <g>
          <path d={`M52 ${headTop + 26} Q100 ${headTop + 12} 148 ${headTop + 26}`} fill="none" stroke="#FF4F79" strokeWidth="7" strokeLinecap="round" />
          <g transform={`translate(100 ${headTop + 16})`}>
            <path d="M0 5 C-6 -3 -14 -3 -14 4 C-14 10 -6 14 0 20 C6 14 14 10 14 4 C14 -3 6 -3 0 5 Z" fill="#FF4F79" />
          </g>
        </g>
      );
    case "wizard_hat":
      return (
        <g>
          <path d={`M100 ${headTop - 46} L${122} ${headTop + 14} L${78} ${headTop + 14} Z`} fill="#6B4FC9" stroke="#3E2E82" strokeWidth="2" strokeLinejoin="round" />
          <ellipse cx="100" cy={headTop + 14} rx="30" ry="7" fill="#7A5CDB" stroke="#3E2E82" strokeWidth="2" />
          <path d={`M92 ${headTop - 10} L100 ${headTop - 22} L108 ${headTop - 10} L100 ${headTop + 2} Z`} fill="#FFD25E" />
        </g>
      );
    case "santa_hat":
      return (
        <g>
          <path d={`M78 ${headTop + 10} C78 ${headTop - 26} 120 ${headTop - 34} 128 ${headTop - 8} C112 ${headTop - 4} 96 ${headTop} 78 ${headTop + 10} Z`} fill="#E8341C" stroke="#9c1c0d" strokeWidth="1.5" />
          <ellipse cx="100" cy={headTop + 10} rx="28" ry="7" fill="#FFFFFF" />
          <circle cx="128" cy={headTop - 10} r="7" fill="#FFFFFF" />
        </g>
      );
    case "pumpkin_hat":
      return (
        <g>
          <ellipse cx="100" cy={headTop + 4} rx="20" ry="14" fill="#F0723A" stroke="#8a3d18" strokeWidth="1.5" />
          <path d={`M92 ${headTop - 6} L92 ${headTop + 4} M100 ${headTop - 8} L100 ${headTop + 4} M108 ${headTop - 6} L108 ${headTop + 4}`} stroke="#8a3d18" strokeWidth="1.2" opacity="0.6" />
          <path d={`M100 ${headTop - 8} L100 ${headTop - 16}`} stroke="#4E7A3D" strokeWidth="3" strokeLinecap="round" />
          <ellipse cx="106" cy={headTop - 16} rx="4" ry="2.6" fill="#5FA84C" />
        </g>
      );
    default:
      return null;
  }
}
