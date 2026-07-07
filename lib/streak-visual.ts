/**
 * Quy tắc màu lửa streak — càng giữ chuỗi lâu, lửa càng "dữ" và hiếm hơn.
 * Lấy cảm hứng từ TikTok: icon lửa luôn giữ tông màu LỬA THẬT (vàng lõi ->
 * cam -> đỏ), không đổi thành trắng/màu lạ — chỉ NỀN viên huy hiệu và mức độ
 * lấp lánh mới đổi theo tier. Hiệu ứng cố tình làm rất nhẹ nhàng, không có gì
 * lặp vô hạn gây rối mắt khi đang nhắn tin: chỉ có 1 lần "pop" khi số tăng và
 * 1 nhịp bập bùng rất nhỏ của riêng ngọn lửa (giống lửa thật, không giật cục).
 */
export interface FlameTier {
  id: string;
  label: string;
  /** Màu nền viên huy hiệu (pill) */
  from: string;
  to: string;
  /** Glow tĩnh quanh huy hiệu — không nhấp nháy, chỉ 1 quầng sáng cố định. */
  glow: string;
  textClassName: string;
  /** Từ tier này trở lên, số streak có thêm chút lấp lánh tĩnh (gradient chữ), không animate. */
  special: boolean;
}

const TIERS: (FlameTier & { min: number })[] = [
  { id: "none", min: -Infinity, label: "Chưa giữ chuỗi", from: "#C7C0C4", to: "#A79FA4", glow: "transparent", textClassName: "text-[var(--muted)]", special: false },
  { id: "spark", min: 1, label: "Mới nhen nhóm", from: "#FFB259", to: "#FF6A1A", glow: "#FF6A1A55", textClassName: "text-orange-500", special: false },
  { id: "blaze", min: 7, label: "Đang cháy", from: "#FF7A45", to: "#E8341C", glow: "#E8341C55", textClassName: "text-red-500", special: false },
  { id: "azure", min: 30, label: "Lửa xanh rực", from: "#5FD0FF", to: "#1673E0", glow: "#1673E055", textClassName: "text-sky-500", special: false },
  { id: "violet", min: 100, label: "Lửa tím cực đỉnh", from: "#C99BFC", to: "#7A21F0", glow: "#7A21F055", textClassName: "text-violet-500", special: false },
  { id: "legend", min: 300, label: "Lửa huyền thoại", from: "#FFD25E", to: "#FF3D93", glow: "#FF3D9355", textClassName: "bg-gradient-to-r from-amber-400 via-pink-500 to-violet-500 bg-clip-text text-transparent", special: true },
  { id: "mythic", min: 1000, label: "Ngọn lửa tối thượng", from: "#8CFFDA", to: "#0EA5E9", glow: "#0EA5E955", textClassName: "bg-gradient-to-r from-cyan-300 via-fuchsia-400 to-amber-300 bg-clip-text text-transparent", special: true },
];

/** Gradient của riêng NGỌN LỬA (icon) — luôn tông vàng->cam->đỏ như lửa thật/TikTok,
 * tách biệt khỏi màu nền viên huy hiệu để icon không bao giờ bị "lạc màu" (vd trắng, xanh, tím). */
export const FLAME_ICON_COLORS = { core: "#FFE9A8", mid: "#FF9D2E", tip: "#E8341C" };

export function getFlameTier(streak: number): FlameTier {
  let current: FlameTier & { min: number } = TIERS[0];
  for (const tier of TIERS) {
    if (streak >= tier.min) current = tier;
  }
  const { min: _min, ...rest } = current;
  void _min;
  return rest;
}

/** Toàn bộ các mốc (trừ "chưa có chuỗi") — dùng để hiển thị lộ trình trong PetSheet. */
export function getAllFlameTiers(): FlameTier[] {
  return TIERS.filter((t) => t.id !== "none").map(({ min: _m, ...rest }) => {
    void _m;
    return rest;
  });
}
