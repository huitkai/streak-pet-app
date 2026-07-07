"use client";

export type StickerId =
  | "heart"
  | "kiss"
  | "hug"
  | "flame-streak"
  | "cake"
  | "flower"
  | "star-eyes"
  | "sleepy"
  | "laugh"
  | "wink"
  | "paw-wave"
  | "confetti";

export const STICKER_IDS: StickerId[] = [
  "heart",
  "kiss",
  "hug",
  "flame-streak",
  "cake",
  "flower",
  "star-eyes",
  "sleepy",
  "laugh",
  "wink",
  "paw-wave",
  "confetti",
];

export const STICKER_LABEL: Record<StickerId, string> = {
  heart: "Trái tim",
  kiss: "Nụ hôn",
  hug: "Ôm ấp",
  "flame-streak": "Giữ lửa",
  cake: "Bánh mừng",
  flower: "Tặng hoa",
  "star-eyes": "Mắt sao",
  sleepy: "Buồn ngủ",
  laugh: "Cười lăn",
  wink: "Nháy mắt",
  "paw-wave": "Vẫy chào",
  confetti: "Ăn mừng",
};

const strokeProps = {
  fill: "none",
  stroke: "#5C3A4A",
  strokeWidth: 3,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

/** Vẽ sticker theo id — mọi sticker là SVG gốc, phong cách nhất quán, có thể animate qua className */
export function StickerArt({ id, className = "h-16 w-16" }: { id: StickerId; className?: string }) {
  switch (id) {
    case "heart":
      return (
        <svg viewBox="0 0 100 100" className={className}>
          <path
            d="M50 84S12 58 12 34c0-14 11-22 22-19 8 2 13 8 16 14 3-6 8-12 16-14 11-3 22 5 22 19 0 24-38 50-38 50Z"
            fill="#F4527B"
          />
          <ellipse cx="34" cy="34" rx="8" ry="6" fill="#ffffff" opacity="0.5" />
        </svg>
      );
    case "kiss":
      return (
        <svg viewBox="0 0 100 100" className={className}>
          <circle cx="50" cy="50" r="38" fill="#FFD9A0" />
          <path d="M32 55c4 4 10 6 18 6s14-2 18-6" {...strokeProps} />
          <circle cx="36" cy="42" r="4" fill="#5C3A4A" />
          <circle cx="64" cy="42" r="4" fill="#5C3A4A" />
          <path d="M42 66c3 5 13 5 16 0" fill="#E8557A" stroke="#B8395C" strokeWidth="2" />
          <path d="M78 30c6 4 10 10 8 18-6-2-12-4-14-10-1-4 1-7 6-8Z" fill="#F4527B" />
        </svg>
      );
    case "hug":
      return (
        <svg viewBox="0 0 100 100" className={className}>
          <circle cx="36" cy="46" r="22" fill="#F4A94C" />
          <circle cx="64" cy="46" r="22" fill="#F0723A" />
          <path d="M20 62c8 14 24 20 30 20s22-6 30-20" {...strokeProps} fill="none" />
          <circle cx="30" cy="42" r="3" fill="#5C3A4A" />
          <circle cx="42" cy="42" r="3" fill="#5C3A4A" />
          <circle cx="58" cy="42" r="3" fill="#5C3A4A" />
          <circle cx="70" cy="42" r="3" fill="#5C3A4A" />
        </svg>
      );
    case "flame-streak":
      return (
        <svg viewBox="0 0 100 100" className={className}>
          <path
            d="M50 10c3 16-8 22-14 30-6 8-8 16-8 24a22 22 0 0 0 44 0c0-8-3-13-7-19-1 8-5 11-8 13 2-10-2-18-8-27-1 5 1 9 3 12C48 34 47 20 50 10Z"
            fill="#FF7A3D"
          />
          <path d="M50 46c1 8-4 11-6 15-2 4-3 8-3 12a9 9 0 0 0 18 0c0-4-1-6-3-9 0 4-2 5-4 6 1-5-1-9-4-13-0 2 0 4 1 6-3-4-2-11 1-17Z" fill="#FFD166" />
        </svg>
      );
    case "cake":
      return (
        <svg viewBox="0 0 100 100" className={className}>
          <rect x="22" y="58" width="56" height="26" rx="4" fill="#F7C6D9" stroke="#D97D9E" strokeWidth="2" />
          <rect x="22" y="58" width="56" height="8" fill="#EFA9C6" />
          <path d="M22 58c6-6 12 4 18-2s12 4 18-2 12 4 18-2" fill="none" stroke="#D97D9E" strokeWidth="2" />
          <rect x="46" y="34" width="8" height="20" rx="2" fill="#FFE3A0" />
          <path d="M50 22c4 4 4 8 0 12-4-4-4-8 0-12Z" fill="#FF9F43" className="animate-flame" style={{ transformOrigin: "50px 28px" }} />
        </svg>
      );
    case "flower":
      return (
        <svg viewBox="0 0 100 100" className={className}>
          <path d="M50 66V90" {...strokeProps} stroke="#4E9A56" />
          <path d="M50 78c-8 0-14-4-16-10 8-2 14 2 16 10Z" fill="#4E9A56" />
          <g>
            {[0, 60, 120, 180, 240, 300].map((deg) => (
              <ellipse key={deg} cx="50" cy="34" rx="9" ry="16" fill="#F291C1" transform={`rotate(${deg} 50 50)`} />
            ))}
          </g>
          <circle cx="50" cy="50" r="9" fill="#FFD166" />
        </svg>
      );
    case "star-eyes":
      return (
        <svg viewBox="0 0 100 100" className={className}>
          <circle cx="50" cy="50" r="38" fill="#FDE28A" />
          <StarShape cx={36} cy={42} r={9} />
          <StarShape cx={64} cy={42} r={9} />
          <path d="M38 66q12 8 24 0" {...strokeProps} />
        </svg>
      );
    case "sleepy":
      return (
        <svg viewBox="0 0 100 100" className={className}>
          <circle cx="50" cy="50" r="38" fill="#C9D6F5" />
          <path d="M30 44q6-6 12 0" {...strokeProps} />
          <path d="M58 44q6-6 12 0" {...strokeProps} />
          <ellipse cx="50" cy="64" rx="8" ry="5" fill="#5C3A4A" />
          <text x="66" y="26" fontSize="16" fill="#5C3A4A" fontFamily="Arial">z</text>
          <text x="76" y="16" fontSize="12" fill="#5C3A4A" fontFamily="Arial">z</text>
        </svg>
      );
    case "laugh":
      return (
        <svg viewBox="0 0 100 100" className={className}>
          <circle cx="50" cy="50" r="38" fill="#FFD9A0" />
          <path d="M28 40q10-10 16 0" {...strokeProps} />
          <path d="M56 40q10-10 16 0" {...strokeProps} />
          <path d="M28 58c4 12 16 18 22 18s18-6 22-18Z" fill="#5C3A4A" />
          <path d="M34 58c3 6 10 10 16 10s13-4 16-10Z" fill="#F4527B" />
        </svg>
      );
    case "wink":
      return (
        <svg viewBox="0 0 100 100" className={className}>
          <circle cx="50" cy="50" r="38" fill="#B7E4C7" />
          <path d="M28 42q8-8 16 0" {...strokeProps} />
          <circle cx="64" cy="42" r="4" fill="#5C3A4A" />
          <path d="M38 64q12 8 24 0" {...strokeProps} />
        </svg>
      );
    case "paw-wave":
      return (
        <svg viewBox="0 0 100 100" className={className}>
          <circle cx="38" cy="40" r="7" fill="#F4A94C" />
          <circle cx="56" cy="32" r="7" fill="#F4A94C" />
          <circle cx="74" cy="40" r="7" fill="#F4A94C" />
          <circle cx="80" cy="56" r="6.5" fill="#F4A94C" />
          <path d="M50 84c-14 0-22-7-22-17 0-9 8-15 22-15s22 6 22 15c0 10-8 17-22 17Z" fill="#F4A94C" />
        </svg>
      );
    case "confetti":
      return (
        <svg viewBox="0 0 100 100" className={className}>
          <path d="M20 80 60 20" stroke="#F4A94C" strokeWidth="4" strokeLinecap="round" />
          {(
            [
              [24, 60, "#F4527B"],
              [40, 30, "#FFD166"],
              [60, 50, "#4E9A56"],
              [72, 26, "#5B8DEF"],
              [50, 70, "#F4527B"],
              [80, 60, "#FFD166"],
            ] as [number, number, string][]
          ).map(([x, y, c], i) => (
            <rect key={i} x={x} y={y} width="8" height="8" rx="2" fill={c} transform={`rotate(${i * 37} ${x} ${y})`} />
          ))}
        </svg>
      );
  }
}

function StarShape({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    const radius = i % 2 === 0 ? r : r / 2.4;
    return `${cx + radius * Math.cos(angle)},${cy + radius * Math.sin(angle)}`;
  }).join(" ");
  return <polygon points={pts} fill="#FFB020" />;
}
