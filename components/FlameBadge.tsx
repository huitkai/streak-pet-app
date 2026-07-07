"use client";

import { getFlameTier, FLAME_ICON_COLORS } from "@/lib/streak-visual";

const SIZE_MAP = { sm: 14, md: 18, lg: 30, xl: 26 } as const;
const TEXT_SIZE_MAP = { sm: "text-[11px]", md: "text-sm", lg: "text-2xl", xl: "text-lg" } as const;

const OUTER_PATH =
  "M12.96 2.29a.75.75 0 0 0-1.07-.14 9.74 9.74 0 0 0-3.54 6.18 7.55 7.55 0 0 1-1.7-1.72.75.75 0 0 0-1.16-.08A9 9 0 1 0 15.68 4.53a7.46 7.46 0 0 1-2.72-2.24Z";
const INNER_PATH =
  "M15.75 14.25a3.75 3.75 0 1 1-7.31-1.17c.63.46 1.35.8 2.13 1 .2-1.42.9-2.68 1.93-3.54a3.75 3.75 0 0 1 3.25 3.71Z";

/** Icon lửa 2 lớp: thân lửa ngoài (path lớn) + lưỡi lửa trong (path nhỏ). Luôn
 * dùng gradient "vàng lõi -> cam -> đỏ" giống lửa TikTok thật — không đổi
 * thành trắng/xanh/tím dù badge nền màu gì, để lúc nào cũng nhận ra ngay là
 * lửa. Animation chỉ là 1 nhịp bập bùng RẤT nhẹ (flame-flicker-soft, biên độ
 * nhỏ), không có hiệu ứng phụ nào lặp lại gây rối mắt khi đang nhắn tin. */
function Flame({ dims, uid, animated }: { dims: number; uid: string; animated: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width={dims} height={dims} className={animated ? "animate-flame-soft" : ""}>
      <defs>
        <linearGradient id={`flame-${uid}`} x1="0" y1="1" x2="0.2" y2="0">
          <stop offset="0%" stopColor={FLAME_ICON_COLORS.tip} />
          <stop offset="55%" stopColor={FLAME_ICON_COLORS.mid} />
          <stop offset="100%" stopColor={FLAME_ICON_COLORS.core} />
        </linearGradient>
        <linearGradient id={`flame-core-${uid}`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor={FLAME_ICON_COLORS.mid} />
          <stop offset="100%" stopColor={FLAME_ICON_COLORS.core} />
        </linearGradient>
      </defs>
      <path d={OUTER_PATH} fill={`url(#flame-${uid})`} />
      <path d={INNER_PATH} fill={`url(#flame-core-${uid})`} />
    </svg>
  );
}

/**
 * Huy hiệu lửa streak.
 * - variant="plain": chỉ icon + số, dùng ở nơi cần gọn (vd PetSheet).
 * - variant="pill": viên nang nền màu theo tier, icon lửa luôn giữ tông màu
 *   lửa thật (vàng-cam-đỏ) kiểu TikTok, số đậm màu trắng.
 *
 * Chủ đích thiết kế: hiệu ứng CHỈ chạy 1 lần khi số streak thay đổi
 * (animate-streak-pop) rồi đứng yên — không còn particle/ring/rainbow lặp vô
 * hạn nữa, để không gây xao nhãng lúc đang nhắn tin. Quầng sáng (glow) là
 * static, không nhấp nháy.
 */
export default function FlameBadge({
  streak,
  size = "md",
  variant = "plain",
}: {
  streak: number;
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "plain" | "pill";
}) {
  const tier = getFlameTier(streak);
  const dims = SIZE_MAP[size];
  const uid = `${tier.id}-${size}-${variant}`;
  const alive = streak > 0;

  if (variant === "pill") {
    return (
      <span
        key={streak}
        className="relative inline-flex items-center gap-1.5 rounded-full py-1.5 pl-2.5 pr-3.5 animate-streak-pop"
        style={{
          background: alive
            ? `linear-gradient(145deg, ${tier.from}, ${tier.to})`
            : "linear-gradient(145deg, #E4DEE1, #CFC7CC)",
          boxShadow: alive
            ? `0 2px 8px -2px ${tier.glow}, inset 0 1px 0 rgba(255,255,255,0.45), inset 0 -2px 4px rgba(0,0,0,0.1)`
            : "inset 0 1px 0 rgba(255,255,255,0.5)",
        }}
      >
        <Flame dims={dims} uid={uid} animated={alive} />
        <span
          className={`font-extrabold leading-none tabular-nums ${TEXT_SIZE_MAP[size]} ${
            alive ? "text-white drop-shadow-sm" : "text-[var(--muted)]"
          }`}
        >
          {streak}
        </span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1">
      <Flame dims={dims} uid={uid} animated={alive} />
      <span className={`font-bold leading-none ${TEXT_SIZE_MAP[size]} ${tier.textClassName}`}>{streak}</span>
    </span>
  );
}
