"use client";

/**
 * Bộ icon SVG vẽ tay (stroke-based, đồng bộ 1 style) — KHÔNG dùng emoji.
 * Mọi icon nhận className để chỉnh size/màu qua Tailwind (w-5 h-5, text-pink-500...).
 */

type IconProps = { className?: string; strokeWidth?: number };

const base = {
  fill: "none",
  stroke: "currentColor",
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function FlameIcon({ className = "w-5 h-5", strokeWidth = 1.8 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base} strokeWidth={strokeWidth}>
      <path d="M12 2.5c.6 3.2-1.4 4.6-2.8 6.3C7.6 10.8 7 12.5 7 14a5 5 0 0 0 10 0c0-1.7-.6-2.8-1.5-4-.2 1.6-1 2.4-1.7 2.9.4-2.2-.3-4-1.8-6C11 5.4 11.6 3.8 12 2.5Z" />
    </svg>
  );
}

export function SendIcon({ className = "w-5 h-5", strokeWidth = 1.8 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base} strokeWidth={strokeWidth}>
      <path d="M21 3 3 10.5l7 2.5 2 7L21 3Z" />
      <path d="M12 13 21 3" />
    </svg>
  );
}

export function HeartIcon({ className = "w-5 h-5", strokeWidth = 1.8, filled = false }: IconProps & { filled?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base} strokeWidth={strokeWidth} fill={filled ? "currentColor" : "none"}>
      <path d="M12 20.5s-7.5-4.6-10-9.3C.4 8 1.7 4.5 5 3.6c2-.5 3.9.3 5 1.9 1.1-1.6 3-2.4 5-1.9 3.3.9 4.6 4.4 3 7.6-2.5 4.7-10 9.3-10 9.3Z" />
    </svg>
  );
}

export function LogOutIcon({ className = "w-5 h-5", strokeWidth = 1.8 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base} strokeWidth={strokeWidth}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  );
}

export function CopyIcon({ className = "w-5 h-5", strokeWidth = 1.8 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base} strokeWidth={strokeWidth}>
      <rect x="8" y="8" width="13" height="13" rx="2.5" />
      <path d="M4.5 16H4a1.5 1.5 0 0 1-1.5-1.5V4A1.5 1.5 0 0 1 4 2.5h10.5A1.5 1.5 0 0 1 16 4v.5" />
    </svg>
  );
}

export function UsersIcon({ className = "w-5 h-5", strokeWidth = 1.8 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base} strokeWidth={strokeWidth}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M2.5 20c.6-3.6 3.2-5.6 6.5-5.6s5.9 2 6.5 5.6" />
      <circle cx="17.5" cy="8.5" r="2.6" />
      <path d="M15.8 14.7c2.6.3 4.4 2.1 4.9 5.3" />
    </svg>
  );
}

export function MailIcon({ className = "w-5 h-5", strokeWidth = 1.8 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base} strokeWidth={strokeWidth}>
      <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
      <path d="M3.5 6.5 12 13l8.5-6.5" />
    </svg>
  );
}

export function LockIcon({ className = "w-5 h-5", strokeWidth = 1.8 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base} strokeWidth={strokeWidth}>
      <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" />
      <path d="M7.5 10.5V7a4.5 4.5 0 0 1 9 0v3.5" />
      <path d="M12 14.5v3" />
    </svg>
  );
}

export function ArrowLeftIcon({ className = "w-5 h-5", strokeWidth = 1.8 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M19 12H5M5 12L11 6M5 12L11 18"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ArrowRightIcon({ className = "w-5 h-5", strokeWidth = 1.8 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base} strokeWidth={strokeWidth}>
      <path d="M4 12h16" />
      <path d="M13 5l7 7-7 7" />
    </svg>
  );
}

export function SparkleIcon({ className = "w-5 h-5", strokeWidth = 1.6 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base} strokeWidth={strokeWidth}>
      <path d="M12 3c.7 3.6 2.4 5.3 6 6-3.6.7-5.3 2.4-6 6-.7-3.6-2.4-5.3-6-6 3.6-.7 5.3-2.4 6-6Z" />
      <path d="M19 15c.3 1.4.9 2 2.3 2.3-1.4.3-2 .9-2.3 2.3-.3-1.4-.9-2-2.3-2.3 1.4-.3 2-.9 2.3-2.3Z" />
    </svg>
  );
}

export function SmileStickerIcon({ className = "w-5 h-5", strokeWidth = 1.8 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base} strokeWidth={strokeWidth}>
      <rect x="3" y="3" width="18" height="18" rx="6" />
      <path d="M8.5 10.5v.5" />
      <path d="M15.5 10.5v.5" />
      <path d="M8 14.5c1 1.3 2.4 2 4 2s3-.7 4-2" />
    </svg>
  );
}

export function PawIcon({ className = "w-5 h-5", strokeWidth = 1.6 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base} strokeWidth={strokeWidth}>
      <circle cx="7" cy="8" r="1.8" />
      <circle cx="12" cy="6" r="1.8" />
      <circle cx="17" cy="8" r="1.8" />
      <circle cx="19" cy="12.5" r="1.7" />
      <path d="M12 21c-3.2 0-5.3-1.7-5.3-4.2 0-2.3 2-3.8 5.3-3.8s5.3 1.5 5.3 3.8c0 2.5-2.1 4.2-5.3 4.2Z" />
    </svg>
  );
}

export function CheckIcon({ className = "w-5 h-5", strokeWidth = 2 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base} strokeWidth={strokeWidth}>
      <path d="M4 12.5l5.5 5.5L20 6.5" />
    </svg>
  );
}

export function EyeIcon({ className = "w-5 h-5", strokeWidth = 1.8 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base} strokeWidth={strokeWidth}>
      <path d="M2 12s3.8-7 10-7 10 7 10 7-3.8 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function EyeOffIcon({ className = "w-5 h-5", strokeWidth = 1.8 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base} strokeWidth={strokeWidth}>
      <path d="M3 3l18 18" />
      <path d="M10.6 5.2A10.7 10.7 0 0 1 12 5c6.2 0 10 7 10 7a17.7 17.7 0 0 1-3.4 4.3M6.6 6.6C3.7 8.5 2 12 2 12s3.8 7 10 7c1.4 0 2.7-.3 3.8-.8" />
      <path d="M9.5 9.8a3 3 0 0 0 4.2 4.2" />
    </svg>
  );
}

export function AlertCircleIcon({ className = "w-5 h-5", strokeWidth = 1.8 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base} strokeWidth={strokeWidth}>
      <circle cx="12" cy="12" r="9.2" />
      <path d="M12 7.5v5.5" />
      <path d="M12 16.5h.01" />
    </svg>
  );
}

export function ShieldCheckIcon({ className = "w-5 h-5", strokeWidth = 1.8 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base} strokeWidth={strokeWidth}>
      <path d="M12 3.2 4.5 6v6c0 5 3.4 7.7 7.5 9 4.1-1.3 7.5-4 7.5-9V6L12 3.2Z" />
      <path d="M9 12.2l2.1 2.1L15.3 10" />
    </svg>
  );
}

export function PlusIcon({ className = "w-5 h-5", strokeWidth = 1.8 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base} strokeWidth={strokeWidth}>
      <path d="M12 4.5v15M4.5 12h15" />
    </svg>
  );
}

export function ChevronDownIcon({ className = "w-5 h-5", strokeWidth = 1.8 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base} strokeWidth={strokeWidth}>
      <path d="M5 8.5 12 15.5 19 8.5" />
    </svg>
  );
}

export function TrophyIcon({ className = "w-5 h-5", strokeWidth = 1.7 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base} strokeWidth={strokeWidth}>
      <path d="M7 4h10v5a5 5 0 0 1-10 0V4Z" />
      <path d="M7 5.5H4.2C4 8 5.2 9.6 7 10" />
      <path d="M17 5.5h2.8c.2 2.5-1 4.1-2.8 4.5" />
      <path d="M12 14v3" />
      <path d="M8.5 20.5h7" />
      <path d="M9.5 17.5h5l.6 3h-6.2l.6-3Z" />
    </svg>
  );
}

export function CameraIcon({ className = "w-5 h-5", strokeWidth = 1.8 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2l1-2h7l1 2h2A1.5 1.5 0 0 1 20 8.5v9A1.5 1.5 0 0 1 18.5 19h-13A1.5 1.5 0 0 1 4 17.5v-9Z"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
      <circle cx="12" cy="13" r="3.4" stroke="currentColor" strokeWidth={strokeWidth} />
    </svg>
  );
}

export function ImageIcon({ className = "w-5 h-5", strokeWidth = 1.8 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base} strokeWidth={strokeWidth}>
      <rect x="3" y="4" width="18" height="16" rx="3" />
      <circle cx="8.5" cy="9.5" r="1.6" />
      <path d="M21 16.5 15.5 12l-8 7" />
    </svg>
  );
}

export function CameraFlipIcon({ className = "w-5 h-5", strokeWidth = 1.8 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base} strokeWidth={strokeWidth}>
      <path d="M17 8H5.5A1.5 1.5 0 0 0 4 9.5V15" />
      <path d="M14.5 5.5 17 8l-2.5 2.5" />
      <path d="M7 16h11.5a1.5 1.5 0 0 0 1.5-1.5V9" />
      <path d="M9.5 18.5 7 16l2.5-2.5" />
    </svg>
  );
}

export function ReplyIcon({ className = "w-5 h-5", strokeWidth = 1.8 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M9 8 4 12l5 4M4 12h9.5a5.5 5.5 0 0 1 5.5 5.5V19"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ForwardMsgIcon({ className = "w-5 h-5", strokeWidth = 1.8 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M15 8l5 4-5 4M20 12h-9.5A5.5 5.5 0 0 0 5 17.5V19"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PinIcon({ className = "w-5 h-5", strokeWidth = 1.8, filled = false }: IconProps & { filled?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M14.5 3.5 20 9l-2 2-1-1-3.5 3.5.5 4-1.5 1.5-3.5-3.5-4 4-1-1 4-4L4.5 11 6 9.5l4 .5L13.5 6l-1-1 2-1.5Z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function BellOffIcon({ className = "w-5 h-5", strokeWidth = 1.8, filled = false }: IconProps & { filled?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M18 8a6 6 0 0 0-9.8-4.7M6 8v4.5c0 1-.4 2-1.1 2.7L4 16h13M15 19a3 3 0 0 1-5.9.7M3 3l18 18"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function EditIcon({ className = "w-5 h-5", strokeWidth = 1.8 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="m14.5 4.5 5 5L8 21H3v-5L14.5 4.5Z"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function TrashIcon({ className = "w-5 h-5", strokeWidth = 1.8 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M4 7h16M9 7V4.8c0-.44.36-.8.8-.8h4.4c.44 0 .8.36.8.8V7m-9 0 .8 12.2a2 2 0 0 0 2 1.8h4.4a2 2 0 0 0 2-1.8L19 7"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function UndoIcon({ className = "w-5 h-5", strokeWidth = 1.8 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M7 8 3 12l4 4M3 12h10a6 6 0 0 1 0 12"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M13 12h-.001" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" />
    </svg>
  );
}

export function SearchIcon({ className = "w-5 h-5", strokeWidth = 1.8 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" strokeWidth={strokeWidth} />
      <path d="m20 20-4.35-4.35" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" />
    </svg>
  );
}

export function MicIcon({ className = "w-5 h-5", strokeWidth = 1.8 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="9" y="3" width="6" height="11" rx="3" stroke="currentColor" strokeWidth={strokeWidth} />
      <path
        d="M5 11a7 7 0 0 0 14 0M12 18v3"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    </svg>
  );
}

export function PlayIcon({ className = "w-5 h-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M8 5.5v13l11-6.5-11-6.5Z" />
    </svg>
  );
}

export function PauseIcon({ className = "w-5 h-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <rect x="6" y="5" width="4.5" height="14" rx="1" />
      <rect x="13.5" y="5" width="4.5" height="14" rx="1" />
    </svg>
  );
}

export function XIcon({ className = "w-5 h-5", strokeWidth = 1.8 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base} strokeWidth={strokeWidth}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

export function MoreIcon({ className = "w-5 h-5", strokeWidth = 1.8 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" strokeWidth={strokeWidth}>
      <circle cx="5" cy="12" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="19" cy="12" r="1.6" />
    </svg>
  );
}

/** Check đơn (đã gửi) — 1 dấu tick mảnh, dùng cho trạng thái gửi tin nhắn. */
export function CheckSingleIcon({ className = "w-3.5 h-3.5", strokeWidth = 2.2 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base} strokeWidth={strokeWidth}>
      <path d="M4 12.5 9.5 18 20 6" />
    </svg>
  );
}

/** Check đúp (đã nhận / đã xem) — 2 dấu tick chồng nhau kiểu Messenger/Zalo;
 * đổi màu qua className (currentColor) để phân biệt "đã nhận" (muted) và
 * "đã xem" (brand). */
export function CheckDoubleIcon({ className = "w-4 h-3.5", strokeWidth = 2.2 }: IconProps) {
  return (
    <svg viewBox="0 0 28 24" className={className} {...base} strokeWidth={strokeWidth}>
      <path d="M2 12.5 7.5 18 16 8" />
      <path d="M11 12.5 16.5 18 26 6" />
    </svg>
  );
}

/** Bảng màu (palette) — dùng cho mục "đổi màu chủ đề" trong sheet tuỳ chỉnh đoạn chat. */
export function PaletteIcon({ className = "w-5 h-5", strokeWidth = 1.7 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base} strokeWidth={strokeWidth}>
      <path d="M12 3a9 9 0 1 0 0 18c1 0 1.7-.5 1.7-1.4 0-.45-.2-.85-.45-1.15-.25-.3-.45-.7-.45-1.15 0-.9.75-1.6 1.65-1.6H16a4.5 4.5 0 0 0 4.5-4.5C20.5 6.8 16.7 3 12 3Z" />
      <circle cx="7.5" cy="11" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="9.5" cy="7" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="14.5" cy="7" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="16.5" cy="11" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Nhà (Home) — dùng cho thanh điều hướng kiểu Instagram (mobile tab bar /
 * desktop nav rail). */
export function HomeIcon({ className = "w-5 h-5", strokeWidth = 1.8, filled = false }: IconProps & { filled?: boolean }) {
  if (filled) {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="currentColor">
        <path d="M12 2.6 2.4 10.8c-.4.35-.15 1 .35 1h2.15v8.1c0 .6.5 1.1 1.1 1.1h4.4v-6.2h3.2V21h4.4c.6 0 1.1-.5 1.1-1.1v-8.1h2.15c.5 0 .75-.65.35-1L12 2.6Z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className={className} {...base} strokeWidth={strokeWidth}>
      <path d="M3.5 11.2 12 3.5l8.5 7.7" />
      <path d="M5.5 9.8V19a1 1 0 0 0 1 1H9a1 1 0 0 0 1-1v-4.3h4V19a1 1 0 0 0 1 1h2.5a1 1 0 0 0 1-1V9.8" />
    </svg>
  );
}

/** La bàn (Explore/Search) — icon dạng compass giống tab Khám phá của Instagram. */
export function CompassIcon({ className = "w-5 h-5", strokeWidth = 1.8 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base} strokeWidth={strokeWidth}>
      <circle cx="12" cy="12" r="9.2" />
      <path d="M15.3 8.7 13 13l-4.3 2.3L11 11l4.3-2.3Z" strokeLinejoin="round" />
    </svg>
  );
}

/** Reels — khung chữ nhật bo góc với 2 nét chéo nhỏ ở 2 góc trên, gợi nhớ icon Reels. */
export function ReelIcon({ className = "w-5 h-5", strokeWidth = 1.8 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base} strokeWidth={strokeWidth}>
      <rect x="3" y="4.5" width="18" height="15" rx="4" />
      <path d="M8 4.5 11 9" />
      <path d="M14 4.5 17 9" />
      <path d="M10.3 11.3v4.2l3.8-2.1-3.8-2.1Z" strokeLinejoin="round" />
    </svg>
  );
}

/** Kính lúp tìm kiếm cho danh sách hội thoại (kích thước nhỏ hơn SearchIcon 1 chút
 * về mặt dùng, nhưng hiện tại tái sử dụng cùng path cho nhất quán — giữ tên riêng
 * để chỗ gọi rõ ngữ nghĩa). */
export function SlidersIcon({ className = "w-5 h-5", strokeWidth = 1.8 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base} strokeWidth={strokeWidth}>
      <path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h13M21 18h-1" />
      <circle cx="13" cy="6" r="2" fill="var(--surface, #241b16)" />
      <circle cx="7" cy="12" r="2" fill="var(--surface, #241b16)" />
      <circle cx="17" cy="18" r="2" fill="var(--surface, #241b16)" />
    </svg>
  );
}

export function SettingsIcon({ className = "w-5 h-5", strokeWidth = 1.8 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base} strokeWidth={strokeWidth}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3.5v2.6M12 17.9v2.6M20.5 12h-2.6M6.1 12H3.5M17.66 6.34l-1.84 1.84M8.18 15.82l-1.84 1.84M17.66 17.66l-1.84-1.84M8.18 8.18 6.34 6.34" />
    </svg>
  );
}

export function BellIcon({ className = "w-5 h-5", strokeWidth = 1.8 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base} strokeWidth={strokeWidth}>
      <path d="M6 9a6 6 0 1 1 12 0c0 4.2 1.3 5.7 2 6.5H4c.7-.8 2-2.3 2-6.5Z" />
      <path d="M10 19.5a2 2 0 0 0 4 0" />
    </svg>
  );
}

export function ChevronRightIcon({ className = "w-5 h-5", strokeWidth = 1.8 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base} strokeWidth={strokeWidth}>
      <path d="M9 5.5 15.5 12 9 18.5" />
    </svg>
  );
}

export function PhoneIcon({ className = "w-5 h-5", strokeWidth = 1.8, filled = false }: IconProps & { filled?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base} strokeWidth={strokeWidth} fill={filled ? "currentColor" : "none"}>
      <path d="M5.5 3.5h3l1.6 4.2-2 1.6a12.5 12.5 0 0 0 6.6 6.6l1.6-2 4.2 1.6v3c0 1-.85 1.75-1.83 1.63A17.5 17.5 0 0 1 3.87 5.33 1.65 1.65 0 0 1 5.5 3.5Z" />
    </svg>
  );
}

export function VideoIcon({ className = "w-5 h-5", strokeWidth = 1.8 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base} strokeWidth={strokeWidth}>
      <rect x="3" y="6.5" width="13" height="11" rx="2.5" />
      <path d="M16 10.2 21 7v10l-5-3.2Z" strokeLinejoin="round" />
    </svg>
  );
}

export function ChatBubbleIcon({ className = "w-5 h-5", strokeWidth = 1.8 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base} strokeWidth={strokeWidth}>
      <path d="M4 12c0-4.4 3.6-8 8-8s8 3.6 8 8-3.6 8-8 8c-1.1 0-2.2-.2-3.1-.6L5 20l1.2-4.2C4.8 14.6 4 13.4 4 12Z" />
    </svg>
  );
}
