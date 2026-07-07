/**
 * Tiện ích cho tính năng "đổi màu chủ đề" (theme_color) của 1 cuộc trò
 * chuyện — xem migration-v9-chat-customization.sql. Giá trị lưu DB chỉ có
 * đúng 1 mã hex (map thẳng vào --brand phía client); --brand-dark/
 * --brand-light được TÍNH LẠI ở đây (không lưu thêm cột) bằng cách
 * darken/lighten mã hex gốc, giữ đúng tinh thần "1 màu -> suy ra cả bộ".
 */

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

export function isValidHex(value: string): boolean {
  return HEX_RE.test(value.trim());
}

/** Màu mặc định hiện tại của app (hồng "flame") — dùng khi couple chưa có
 * theme_color (dữ liệu cũ trước migration v9) hoặc giá trị không hợp lệ. */
export const DEFAULT_THEME_COLOR = "#ec4f83";

/** ~8 màu chủ đề dựng sẵn, chọn để chữ trắng trên bong bóng vẫn đủ tương phản
 * (độ sáng vừa-tối, không quá pastel nhạt). */
export const THEME_PRESETS: { hex: string; label: string }[] = [
  { hex: "#ec4f83", label: "Hồng Flame" },
  { hex: "#e0527a", label: "Hồng đào" },
  { hex: "#f0723a", label: "Cam ấm" },
  { hex: "#e0a527", label: "Vàng mật" },
  { hex: "#4caf7d", label: "Xanh lá" },
  { hex: "#2e9bff", label: "Xanh dương" },
  { hex: "#6a5ce0", label: "Tím lam" },
  { hex: "#8a3fbf", label: "Tím violet" },
];

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function rgbToHex(r: number, g: number, b: number): string {
  const c = (n: number) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

/** Trộn 1 màu với đen (amount 0-1) để làm tối đi — dùng cho --brand-dark. */
function darken(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(r * (1 - amount), g * (1 - amount), b * (1 - amount));
}

/** Trộn 1 màu với trắng (amount 0-1) để làm sáng/nhạt đi — dùng cho --brand-light. */
function lighten(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(r + (255 - r) * amount, g + (255 - g) * amount, b + (255 - b) * amount);
}

export interface ThemeShades {
  brand: string;
  brandDark: string;
  brandLight: string;
}

/** Từ 1 hex gốc, suy ra đủ bộ 3 biến CSS --brand/--brand-dark/--brand-light,
 * giống hệt tỉ lệ tối/sáng của bộ màu mặc định hiện có trong globals.css
 * (#ec4f83 -> dark #c73868, light #ffe1ea). */
export function shadesForThemeColor(hexInput: string): ThemeShades {
  const hex = isValidHex(hexInput) ? hexInput : DEFAULT_THEME_COLOR;
  return {
    brand: hex,
    brandDark: darken(hex, 0.22),
    brandLight: lighten(hex, 0.82),
  };
}

/** Style object tiện dùng thẳng trong JSX: `style={themeStyle(couple.theme_color)}` */
export function themeCssVars(hexInput: string): Record<string, string> {
  const { brand, brandDark, brandLight } = shadesForThemeColor(hexInput);
  return {
    ["--brand" as string]: brand,
    ["--brand-dark" as string]: brandDark,
    ["--brand-light" as string]: brandLight,
  };
}
