"use client";

import { useMemo, useState } from "react";
import type { PetStage, PetMood } from "@/lib/types";
import {
  SPECIES_PALETTE,
  STAGE_BODY,
  VARIANT_ACCENT,
  isHeadTopper,
  type PetSpecies,
  type PetVariant,
  type PetAccessory,
} from "@/lib/pets";
import { SparkleIcon } from "@/components/icons";
import { PetAccessoryLayer } from "@/components/PetAccessoryLayer";

/**
 * PetAvatarFallback — bản vẽ pet 100% bằng SVG (không ảnh, không emoji).
 *
 * Dùng làm FALLBACK khi animation Lottie (xem PetLottie.tsx) chưa tải xong
 * hoặc load lỗi — đảm bảo pet luôn hiển thị được, không bao giờ trống trơn.
 * Giữ nguyên toàn bộ logic vẽ cũ để không mất công tái tạo, chỉ đổi tên.
 *
 * Hệ tiến hóa (v2):
 * - Mỗi LOÀI (species) có 1 bộ "đặc điểm" riêng: hình tai, đuôi, hoa văn — vẽ bằng path.
 * - Mỗi GIAI ĐOẠN (stage) giờ đây đổi THẬT SỰ tỉ lệ đầu/thân/tai/đuôi/mắt (xem lib/pets.ts#STAGE_BODY),
 *   không chỉ scale đều toàn thân — baby đầu to bụ bẫm, teen cân đối dần, adult đầy đủ đặc điểm,
 *   legendary thêm cánh + hào quang + vương miện.
 * - Mỗi pet còn RẼ NHÁNH (variant: radiant/mystic) suy ra ổn định từ id cặp đôi + loài, quyết định
 *   tông màu vương miện/hào quang/dấu ấn trưởng thành — 2 cặp cùng loài vẫn có thể trông khác nhau.
 * - PHỤ KIỆN (accessory) là lớp trang trí rời, đeo/tháo tự do, vài cái mở khóa theo mốc streak.
 * - Mọi animation lặp (thở, nháy mắt, đuôi vẫy) dùng CSS keyframes trong globals.css để chạy mượt
 *   bằng GPU; hiệu ứng "tiến hóa" (confetti, particle) dùng Framer Motion — xem PetEvolutionCelebration.
 * - Tương tác "chạm để vuốt ve": onClick kích hoạt state cục bộ -> thêm class animate-pet-pet
 *   + hiện icon SparkleIcon bay lên, tự tắt sau 700ms bằng setTimeout.
 */

export default function PetAvatarFallback({
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
  const palette = SPECIES_PALETTE[species];
  const variantAccent = VARIANT_ACCENT[variant];
  const [petted, setPetted] = useState(false);
  const [burst, setBurst] = useState(0);

  const scale = useMemo(() => {
    switch (stage) {
      case "egg":
        return 0.72;
      case "baby":
        return 0.82;
      case "teen":
        return 0.92;
      case "adult":
        return 1;
      case "legendary":
        return 1.08;
    }
  }, [stage]);

  function handleTap() {
    if (!interactive || stage === "egg") return;
    setPetted(true);
    setBurst((b) => b + 1);
    window.setTimeout(() => setPetted(false), 550);
  }

  const eyeShape = mood === "sad" ? "sad" : mood === "sick" ? "sick" : mood === "happy" ? "happy" : "normal";

  const Wrapper = interactive ? "button" : "div";
  const interactiveProps = interactive
    ? { type: "button" as const, onClick: handleTap, "aria-label": "Vuốt ve pet" }
    : {};

  const showAccessory = accessory !== "none" && stage !== "egg" && !(stage === "legendary" && isHeadTopper(accessory));

  return (
    <Wrapper
      {...interactiveProps}
      className={`relative select-none outline-none ${interactive && stage !== "egg" ? "cursor-pointer active:scale-95" : "cursor-default"}`}
      style={{ width: size, height: size }}
    >
      {/* Hào quang cho legendary — màu theo nhánh tiến hóa (radiant: vàng ấm / mystic: lam bạc), đậm & rộng hơn hẳn adult */}
      {stage === "legendary" && (
        <>
          <div
            className="pointer-events-none absolute inset-0 rounded-full animate-pet-aura"
            style={{ background: `radial-gradient(circle, ${variantAccent.aura}88, transparent 68%)` }}
          />
          <div
            className="pointer-events-none absolute -inset-2 rounded-full"
            style={{
              border: `2px dashed ${variantAccent.crown}77`,
              animation: "pet-aura 2.4s ease-in-out infinite reverse",
            }}
          />
          {/* Hạt sáng lơ lửng quanh pet — chỉ legendary mới có, tạo cảm giác "huyền thoại" rõ rệt */}
          {[
            { top: "6%", left: "14%", delay: "0s" },
            { top: "14%", left: "82%", delay: "0.6s" },
            { top: "78%", left: "88%", delay: "1.1s" },
            { top: "84%", left: "10%", delay: "1.7s" },
          ].map((p, i) => (
            <span
              key={i}
              className="pointer-events-none absolute animate-float-slow"
              style={{ top: p.top, left: p.left, animationDelay: p.delay, color: variantAccent.sparkle }}
            >
              <SparkleIcon className="h-3.5 w-3.5" />
            </span>
          ))}
        </>
      )}

      {/* Vòng tròn nền đế */}
      <div
        className="absolute inset-0 rounded-full"
        style={{ background: `radial-gradient(circle at 32% 28%, ${palette.body2}66, transparent 65%)` }}
      />

      <svg
        viewBox="0 0 200 200"
        className={`relative h-full w-full ${
          petted ? "animate-pet-tap" : excited && mood === "happy" ? "animate-pet-excited" : "animate-pet-breathe"
        }`}
        style={{ transform: `scale(${scale})`, transformOrigin: "50% 60%" }}
      >
        <defs>
          <radialGradient id={`grad-body-${species}`} cx="38%" cy="30%" r="75%">
            <stop offset="0%" stopColor={palette.body2} />
            <stop offset="100%" stopColor={palette.body} />
          </radialGradient>
          <radialGradient id={`grad-head-${species}`} cx="36%" cy="28%" r="80%">
            <stop offset="0%" stopColor={palette.body2} stopOpacity="0.95" />
            <stop offset="55%" stopColor={palette.body} />
            <stop offset="100%" stopColor={palette.body} />
          </radialGradient>
        </defs>
        {/* Bóng đổ mềm dưới chân — giúp pet trông có khối thay vì lơ lửng phẳng */}
        {stage !== "egg" && (
          <ellipse cx="100" cy="176" rx="42" ry="8" fill="#000000" opacity="0.1" />
        )}
        {stage === "egg" ? (
          <EggShape palette={palette} />
        ) : (
          <CreatureShape
            species={species}
            palette={palette}
            stage={stage}
            eyeShape={eyeShape}
            variantAccent={variantAccent}
          />
        )}
        {showAccessory && (
          <PetAccessoryLayer accessory={accessory} stage={stage} cfg={STAGE_BODY[stage as Exclude<PetStage, "egg">]} />
        )}
      </svg>

      {/* Cánh cho legendary — hơi nhuốm màu nhánh tiến hóa */}
      {stage === "legendary" && (
        <svg viewBox="0 0 200 200" className="pointer-events-none absolute inset-0 h-full w-full animate-pet-wing">
          <path d="M55 95 C20 70 10 40 18 18 C42 28 58 46 62 74 Z" fill={palette.body2} opacity="0.85" />
          <path d="M55 95 C20 70 10 40 18 18 C42 28 58 46 62 74 Z" fill={variantAccent.aura} opacity="0.22" />
          <path d="M145 95 C180 70 190 40 182 18 C158 28 142 46 138 74 Z" fill={palette.body2} opacity="0.85" />
          <path d="M145 95 C180 70 190 40 182 18 C158 28 142 46 138 74 Z" fill={variantAccent.aura} opacity="0.22" />
        </svg>
      )}

      {/* Vương miện cho legendary — vàng ở nhánh radiant, bạc lam ở nhánh mystic; nhiều đá quý + dải nền cho ra dáng vương miện thật */}
      {stage === "legendary" && (
        <svg viewBox="0 0 200 200" className="pointer-events-none absolute inset-0 h-full w-full">
          <defs>
            <linearGradient id={`grad-crown-${variant}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
              <stop offset="100%" stopColor={variantAccent.crown} />
            </linearGradient>
          </defs>
          <path
            d="M76 44 L85 62 L100 34 L115 62 L124 44 L121 68 L79 68 Z"
            fill={`url(#grad-crown-${variant})`}
            stroke={variantAccent.crownStroke}
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <rect x="79" y="64" width="42" height="7" rx="2" fill={variantAccent.crown} stroke={variantAccent.crownStroke} strokeWidth="1.5" />
          <circle cx="100" cy="34" r="3.4" fill={variantAccent.sparkle} />
          <circle cx="85" cy="56" r="2.2" fill={variantAccent.sparkle} />
          <circle cx="115" cy="56" r="2.2" fill={variantAccent.sparkle} />
          <circle cx="100" cy="67.5" r="3" fill="#ffffff" opacity="0.9" />
        </svg>
      )}

      {/* Hiệu ứng lấp lánh khi chạm */}
      {burst > 0 && (
        <span key={burst} className="pointer-events-none absolute -top-2 right-0 animate-pet-sparkle text-amber-400">
          <SparkleIcon className="h-6 w-6" />
        </span>
      )}
    </Wrapper>
  );
}

function EggShape({ palette }: { palette: { body: string; body2: string; accent: string } }) {
  return (
    <g>
      <ellipse cx="100" cy="112" rx="52" ry="64" fill={palette.body2} stroke={palette.accent} strokeWidth="3" />
      <path
        d="M76 70 L92 92 L80 100 L104 128"
        fill="none"
        stroke={palette.accent}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.55"
      />
      <ellipse cx="82" cy="86" rx="10" ry="14" fill="#ffffff" opacity="0.5" />
    </g>
  );
}

function CreatureShape({
  species,
  palette,
  stage,
  eyeShape,
  variantAccent,
}: {
  species: PetSpecies;
  palette: { body: string; body2: string; accent: string; cheek: string };
  stage: Exclude<PetStage, "egg">;
  eyeShape: "normal" | "happy" | "sad" | "sick";
  variantAccent: { crown: string; crownStroke: string; aura: string; mark: string; sparkle: string };
}) {
  const cfg = STAGE_BODY[stage];
  // lib/pets.ts hiện tại không có field pawScale riêng — suy ra tỉ lệ chân theo bodyRx
  // (bodyRx của "adult" = 58 làm mốc 1.0), giữ đúng hiệu ứng "chân lớn dần theo giai đoạn"
  // như thiết kế gốc mà không cần đổi lại interface StageBodyConfig dùng chung nhiều nơi khác.
  const pawScale = cfg.bodyRx / STAGE_BODY.adult.bodyRx;
  // lib/pets.ts hiện tại không có field hasDetail — suy ra từ stage: baby chưa đủ
  // chi tiết (hoa văn/ria), các giai đoạn còn lại thì có, đúng tinh thần thiết kế gốc.
  const hasDetail = stage !== "baby";
  return (
    <g>
      <g transform={`translate(150 140) scale(${cfg.earTailScale}) translate(-150 -140)`}>
        <g
          className={eyeShape === "sad" || eyeShape === "sick" ? "" : "animate-pet-tailwag"}
          style={{ transformBox: "fill-box", transformOrigin: "center" }}
        >
          <SpeciesTail species={species} palette={palette} />
        </g>
      </g>
      {/* Thân — kích thước thay đổi thật theo giai đoạn, gradient để có khối 3D */}
      <ellipse cx="100" cy={cfg.bodyCy} rx={cfg.bodyRx} ry={cfg.bodyRy} fill={`url(#grad-body-${species})`} stroke={palette.accent} strokeWidth="1.4" strokeOpacity="0.35" />
      {/* Bàn chân — vẽ SAU thân để lộ ra ở mép dưới, lớn dần rõ rệt theo giai đoạn (baby gần như chưa thấy chân) */}
      <g transform={`translate(100 ${cfg.bodyCy + cfg.bodyRy * 0.7}) scale(${pawScale}) translate(-100 ${-(cfg.bodyCy + cfg.bodyRy * 0.7)})`}>
        <ellipse cx={100 - cfg.bodyRx * 0.5} cy={cfg.bodyCy + cfg.bodyRy * 0.72} rx="13" ry="9" fill={palette.body2} stroke={palette.accent} strokeWidth="1.2" opacity="0.95" />
        <ellipse cx={100 + cfg.bodyRx * 0.5} cy={cfg.bodyCy + cfg.bodyRy * 0.72} rx="13" ry="9" fill={palette.body2} stroke={palette.accent} strokeWidth="1.2" opacity="0.95" />
      </g>
      {/* Đầu */}
      <circle cx="100" cy="90" r={cfg.headR} fill={`url(#grad-head-${species})`} stroke={palette.accent} strokeWidth="1.4" strokeOpacity="0.35" />
      {/* Highlight bóng láng góc trên trán — cảm giác "gương mặt" bóng khỏe, sạch sẽ */}
      <ellipse cx={100 - cfg.headR * 0.38} cy={90 - cfg.headR * 0.42} rx={cfg.headR * 0.28} ry={cfg.headR * 0.18} fill="#ffffff" opacity="0.35" />
      <g transform={`translate(100 50) scale(${cfg.earTailScale}) translate(-100 -50)`}>
        <SpeciesEars species={species} palette={palette} />
      </g>
      {hasDetail && <SpeciesMarkings species={species} palette={palette} stage={stage} />}
      {hasDetail && <Whiskers species={species} accent={palette.accent} />}

      <g transform={`translate(100 90) scale(${cfg.eyeScale}) translate(-100 -90)`}>
        {/* Má hồng */}
        <ellipse cx="68" cy="99" rx="11" ry="7.5" fill={palette.cheek} opacity="0.8" />
        <ellipse cx="132" cy="99" rx="11" ry="7.5" fill={palette.cheek} opacity="0.8" />

        {/* Mắt (nhấp nháy bằng CSS animate-pet-blink) */}
        <g className="origin-center animate-pet-blink" style={{ transformBox: "fill-box" }}>
          <Eyes shape={eyeShape} accent={palette.accent} />
        </g>

        {/* Miệng theo tâm trạng */}
        <Mouth shape={eyeShape} accent={palette.accent} />
      </g>

      {/* Dấu ấn trưởng thành trên trán — lớn dần từ teen -> adult, nhường chỗ cho vương miện ở legendary */}
      {stage !== "legendary" && cfg.markScale > 0 && (
        <path
          d="M100 60 L106 66 L100 72 L94 66 Z"
          fill={variantAccent.mark}
          opacity={0.85}
          transform={`translate(100 66) scale(${cfg.markScale}) translate(-100 -66)`}
        />
      )}

      {species === "unicorn" && <UnicornHorn stage={stage} variantAccent={variantAccent} />}
    </g>
  );
}

function UnicornHorn({
  stage,
  variantAccent,
}: {
  stage: Exclude<PetStage, "egg">;
  variantAccent: { mark: string; sparkle: string };
}) {
  // Sừng mọc dần theo giai đoạn: baby chỉ là 1 chấm nhú, teen ngắn, adult/legendary dài & lấp lánh.
  const height = stage === "baby" ? 6 : stage === "teen" ? 14 : 22;
  const topY = 44 - height;
  return (
    <g>
      <path
        d={`M94 44 L100 ${topY} L106 44 Z`}
        fill="url(#unicorn-horn-gradient)"
        stroke={variantAccent.mark}
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <defs>
        <linearGradient id="unicorn-horn-gradient" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor={variantAccent.sparkle} />
        </linearGradient>
      </defs>
      {stage !== "baby" && <circle cx="100" cy={topY} r="2.4" fill={variantAccent.sparkle} />}
    </g>
  );
}

function SpeciesTail({ species, palette }: { species: PetSpecies; palette: { body: string; body2: string; accent: string } }) {
  switch (species) {
    case "fox":
      return (
        <path
          d="M152 140 C182 130 190 100 172 84 C186 96 184 122 158 138 Z"
          fill={palette.body}
          stroke={palette.accent}
          strokeWidth="1.5"
        />
      );
    case "wolf":
      return (
        <path
          d="M150 142 C184 136 196 106 180 86 C192 100 190 128 160 142 C168 132 166 118 156 110 Z"
          fill={palette.body}
          stroke={palette.accent}
          strokeWidth="1.5"
        />
      );
    case "dragon":
      return (
        <path
          d="M150 148 C176 150 188 168 180 184 C172 170 158 164 146 162 Z"
          fill={palette.body}
          stroke={palette.accent}
          strokeWidth="1.5"
        />
      );
    case "unicorn":
      return (
        <g>
          <path d="M148 144 C170 152 180 176 168 192 C162 178 150 170 140 166 Z" fill={palette.body2} stroke={palette.accent} strokeWidth="1.2" />
          <path d="M148 144 C170 152 180 176 168 192 C162 178 150 170 140 166 Z" fill="none" stroke="#F6A8D8" strokeWidth="1" opacity="0.6" />
        </g>
      );
    default:
      return (
        <ellipse
          cx="150"
          cy="150"
          rx="14"
          ry="9"
          fill={palette.body}
          stroke={palette.accent}
          strokeWidth="1.2"
          transform="rotate(20 150 150)"
        />
      );
  }
}

function SpeciesEars({
  species,
  palette,
}: {
  species: PetSpecies;
  palette: { body: string; body2: string; accent: string; cheek: string };
}) {
  switch (species) {
    case "cat":
      return (
        <>
          <path d="M62 58 L52 24 L84 48 Z" fill={palette.body} stroke={palette.accent} strokeWidth="2" strokeLinejoin="round" />
          <path d="M138 58 L148 24 L116 48 Z" fill={palette.body} stroke={palette.accent} strokeWidth="2" strokeLinejoin="round" />
          <path d="M64 52 L58 34 L76 48 Z" fill={palette.cheek} opacity="0.6" />
          <path d="M136 52 L142 34 L124 48 Z" fill={palette.cheek} opacity="0.6" />
        </>
      );
    case "fox":
      return (
        <>
          <path d="M60 56 L44 14 L86 46 Z" fill={palette.body} stroke={palette.accent} strokeWidth="2" strokeLinejoin="round" />
          <path d="M140 56 L156 14 L114 46 Z" fill={palette.body} stroke={palette.accent} strokeWidth="2" strokeLinejoin="round" />
          <path d="M60 50 L52 26 L74 46 Z" fill={palette.accent} opacity="0.5" />
          <path d="M140 50 L148 26 L126 46 Z" fill={palette.accent} opacity="0.5" />
        </>
      );
    case "wolf":
      return (
        <>
          <path d="M58 58 L40 10 L88 46 Z" fill={palette.body} stroke={palette.accent} strokeWidth="2" strokeLinejoin="round" />
          <path d="M142 58 L160 10 L112 46 Z" fill={palette.body} stroke={palette.accent} strokeWidth="2" strokeLinejoin="round" />
          <path d="M58 52 L48 24 L76 46 Z" fill={palette.accent} opacity="0.45" />
          <path d="M142 52 L152 24 L124 46 Z" fill={palette.accent} opacity="0.45" />
        </>
      );
    case "dragon":
      return (
        <>
          <path d="M64 54 C50 34 54 16 68 8 C66 26 70 40 78 50 Z" fill={palette.body2} stroke={palette.accent} strokeWidth="2" />
          <path d="M136 54 C150 34 146 16 132 8 C134 26 130 40 122 50 Z" fill={palette.body2} stroke={palette.accent} strokeWidth="2" />
        </>
      );
    case "bunny":
      return (
        <>
          <path d="M78 54 C70 8 62 -6 74 4 C92 18 92 42 92 54 Z" fill={palette.body} stroke={palette.accent} strokeWidth="2" />
          <path d="M122 54 C130 8 138 -6 126 4 C108 18 108 42 108 54 Z" fill={palette.body} stroke={palette.accent} strokeWidth="2" />
          <path d="M80 48 C75 18 70 8 78 12 C88 22 88 38 88 48 Z" fill={palette.cheek} opacity="0.5" />
          <path d="M120 48 C125 18 130 8 122 12 C112 22 112 38 112 48 Z" fill={palette.cheek} opacity="0.5" />
        </>
      );
    case "panda":
      return (
        <>
          <circle cx="60" cy="52" r="20" fill={palette.accent} />
          <circle cx="140" cy="52" r="20" fill={palette.accent} />
        </>
      );
    case "owl":
      return (
        <>
          <path d="M56 60 L44 20 L78 50 Z" fill={palette.body} stroke={palette.accent} strokeWidth="2" strokeLinejoin="round" />
          <path d="M144 60 L156 20 L122 50 Z" fill={palette.body} stroke={palette.accent} strokeWidth="2" strokeLinejoin="round" />
        </>
      );
    case "otter":
      return (
        <>
          <circle cx="66" cy="54" r="12" fill={palette.body} stroke={palette.accent} strokeWidth="2" />
          <circle cx="134" cy="54" r="12" fill={palette.body} stroke={palette.accent} strokeWidth="2" />
        </>
      );
    case "penguin":
      return (
        <>
          <ellipse cx="66" cy="56" rx="7" ry="9" fill={palette.accent} />
          <ellipse cx="134" cy="56" rx="7" ry="9" fill={palette.accent} />
        </>
      );
    case "hamster":
      return (
        <>
          <circle cx="62" cy="56" r="16" fill={palette.body} stroke={palette.accent} strokeWidth="2" />
          <circle cx="138" cy="56" r="16" fill={palette.body} stroke={palette.accent} strokeWidth="2" />
          <circle cx="62" cy="56" r="8" fill={palette.cheek} opacity="0.5" />
          <circle cx="138" cy="56" r="8" fill={palette.cheek} opacity="0.5" />
        </>
      );
    case "koala":
      return (
        <>
          <circle cx="54" cy="62" r="26" fill={palette.body2} stroke={palette.accent} strokeWidth="2" />
          <circle cx="146" cy="62" r="26" fill={palette.body2} stroke={palette.accent} strokeWidth="2" />
          <circle cx="54" cy="62" r="12" fill={palette.body} opacity="0.9" />
          <circle cx="146" cy="62" r="12" fill={palette.body} opacity="0.9" />
        </>
      );
    case "unicorn":
      return (
        <>
          <path d="M76 54 C68 18 62 6 74 12 C90 24 90 44 90 54 Z" fill={palette.body} stroke={palette.accent} strokeWidth="2" />
          <path d="M124 54 C132 18 138 6 126 12 C110 24 110 44 110 54 Z" fill={palette.body} stroke={palette.accent} strokeWidth="2" />
          <path d="M78 48 C74 24 70 14 78 18 C86 26 86 40 86 48 Z" fill="#FFD1EC" opacity="0.6" />
          <path d="M122 48 C126 24 130 14 122 18 C114 26 114 40 114 48 Z" fill="#CDEBFF" opacity="0.6" />
        </>
      );
  }
}

function SpeciesMarkings({
  species,
  palette,
  stage,
}: {
  species: PetSpecies;
  palette: { accent: string; cheek: string };
  stage: Exclude<PetStage, "egg">;
}) {
  if (species === "panda") {
    return (
      <>
        <ellipse cx="78" cy="92" rx="13" ry="16" fill={palette.accent} opacity="0.9" />
        <ellipse cx="122" cy="92" rx="13" ry="16" fill={palette.accent} opacity="0.9" />
      </>
    );
  }
  if (species === "dragon") {
    return <path d="M84 56 L100 44 L116 56" fill="none" stroke={palette.accent} strokeWidth="3" strokeLinecap="round" />;
  }
  if (species === "wolf") {
    return <ellipse cx="100" cy="104" rx="22" ry="14" fill="#FFFFFF" opacity="0.35" />;
  }
  if (species === "hamster" && stage !== "baby") {
    return (
      <>
        <ellipse cx="66" cy="100" rx="12" ry="9" fill={palette.cheek} opacity="0.35" />
        <ellipse cx="134" cy="100" rx="12" ry="9" fill={palette.cheek} opacity="0.35" />
      </>
    );
  }
  if (species === "koala") {
    return <ellipse cx="100" cy="98" rx="9" ry="7" fill={palette.accent} opacity="0.9" />;
  }
  return null;
}

/** Loài có bộ lông mềm được vẽ thêm ria mép — chỉ hiện từ teen trở lên để giữ baby tròn trịa, sạch. */
const WHISKERED_SPECIES: PetSpecies[] = ["cat", "fox", "wolf", "hamster", "otter"];

function Whiskers({ species, accent }: { species: PetSpecies; accent: string }) {
  if (!WHISKERED_SPECIES.includes(species)) return null;
  return (
    <g stroke={accent} strokeWidth="1.4" strokeLinecap="round" opacity="0.55">
      <path d="M62 104 L38 100" />
      <path d="M62 110 L38 112" />
      <path d="M138 104 L162 100" />
      <path d="M138 110 L162 112" />
    </g>
  );
}

function Eyes({ shape, accent }: { shape: "normal" | "happy" | "sad" | "sick"; accent: string }) {
  if (shape === "happy") {
    return (
      <>
        <path d="M62 92 Q72 80 82 92" fill="none" stroke={accent} strokeWidth="3.8" strokeLinecap="round" />
        <path d="M118 92 Q128 80 138 92" fill="none" stroke={accent} strokeWidth="3.8" strokeLinecap="round" />
      </>
    );
  }
  if (shape === "sad") {
    return (
      <>
        <path d="M63 91 Q72 100 81 91" fill="none" stroke={accent} strokeWidth="3.4" strokeLinecap="round" />
        <path d="M119 91 Q128 100 137 91" fill="none" stroke={accent} strokeWidth="3.4" strokeLinecap="round" />
        <path d="M70 101 q3 9 -1 13" fill="none" stroke="#7FB8E8" strokeWidth="2.6" strokeLinecap="round" />
      </>
    );
  }
  if (shape === "sick") {
    return (
      <>
        <path d="M61 85 L81 97 M81 85 L61 97" stroke={accent} strokeWidth="3.2" strokeLinecap="round" />
        <path d="M119 85 L139 97 M139 85 L119 97" stroke={accent} strokeWidth="3.2" strokeLinecap="round" />
      </>
    );
  }
  return (
    <>
      {/* Tròng đen to, bầu bĩnh kiểu chibi cho cảm giác dễ thương hơn */}
      <ellipse cx="71" cy="90" rx="7.4" ry="8.4" fill={accent} />
      <ellipse cx="129" cy="90" rx="7.4" ry="8.4" fill={accent} />
      {/* 2 lớp ánh sáng phản chiếu trong mắt — làm mắt "lấp lánh sống động" thay vì chấm phẳng */}
      <circle cx="74" cy="86" r="2.3" fill="#ffffff" />
      <circle cx="132" cy="86" r="2.3" fill="#ffffff" />
      <circle cx="68.5" cy="93" r="1.1" fill="#ffffff" opacity="0.8" />
      <circle cx="126.5" cy="93" r="1.1" fill="#ffffff" opacity="0.8" />
    </>
  );
}

function Mouth({ shape, accent }: { shape: "normal" | "happy" | "sad" | "sick"; accent: string }) {
  if (shape === "happy") {
    return (
      <>
        <path d="M84 108 Q100 124 116 108" fill="none" stroke={accent} strokeWidth="3.4" strokeLinecap="round" />
        <path d="M92 116 Q100 120 108 116" fill="none" stroke="#FF7A93" strokeWidth="2.2" strokeLinecap="round" opacity="0.5" />
      </>
    );
  }
  if (shape === "sad") {
    return <path d="M87 115 Q100 106 113 115" fill="none" stroke={accent} strokeWidth="3" strokeLinecap="round" />;
  }
  if (shape === "sick") {
    return <ellipse cx="100" cy="112" rx="6" ry="4" fill={accent} opacity="0.7" />;
  }
  return <path d="M88 109 Q100 116 112 109" fill="none" stroke={accent} strokeWidth="2.8" strokeLinecap="round" />;
}