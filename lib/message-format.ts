import type { StickerId } from "@/components/Stickers";

const STICKER_PREFIX = "::sticker::";
const IMAGE_PREFIX = "::image::";
const VOICE_PREFIX = "::voice::";
const GIF_PREFIX = "::gif::";

/** Mã hoá 1 sticker thành nội dung lưu trong cột `content` có sẵn — không cần migrate DB. */
export function encodeSticker(id: StickerId): string {
  return `${STICKER_PREFIX}${id}`;
}

/**
 * Mã hoá 1 ảnh (đã upload lên Supabase Storage) thành nội dung lưu trong cột
 * `content` có sẵn — cùng chiêu với sticker, không cần thêm cột/bảng mới.
 * Format: ::image::<url>::<width>x<height>  (kích thước tuỳ chọn, dùng để giữ
 * đúng tỉ lệ khung ảnh trước khi ảnh thật load xong, tránh giật layout).
 */
export function encodeImage(url: string, width?: number, height?: number): string {
  const dims = width && height ? `::${width}x${height}` : "";
  return `${IMAGE_PREFIX}${url}${dims}`;
}

/** Mã hoá 1 tin nhắn thoại: ::voice::<url>::<durationSeconds> */
export function encodeVoice(url: string, durationSec: number): string {
  return `${VOICE_PREFIX}${url}::${Math.round(durationSec)}`;
}

/**
 * Mã hoá 1 GIF chọn từ tab "GIF" (GIPHY/Tenor) — CÙNG CHIÊU với sticker/ảnh,
 * không cần thêm cột/bảng: ::gif::<url>::<width>x<height>. Khác với ảnh
 * upload lên Storage của mình, GIF trỏ thẳng ra URL bên thứ 3 (GIPHY/Tenor
 * CDN) nên không cần bước tải file — nhẹ hơn nhiều so với ảnh chụp máy.
 */
export function encodeGif(url: string, width?: number, height?: number): string {
  const dims = width && height ? `::${width}x${height}` : "";
  return `${GIF_PREFIX}${url}${dims}`;
}

export type DecodedMessage =
  | { type: "text"; text: string }
  | { type: "sticker"; id: StickerId }
  | { type: "image"; url: string; width?: number; height?: number }
  | { type: "gif"; url: string; width?: number; height?: number }
  | { type: "voice"; url: string; duration: number };

/** Khoảng cách tối thiểu (ms) giữa 2 tin để tự chèn 1 dòng mốc thời gian ở
 * giữa — giống Messenger: gõ liên tục thì không lặp giờ, nhưng cách nhau
 * một lúc lâu thì tự hiện lại mốc giờ cho dễ theo dõi. */
export const TIME_DIVIDER_GAP_MS = 15 * 60 * 1000;

/** "14:32" nếu hôm nay, "Hôm qua 14:32" nếu hôm qua, "Thứ Ba 14:32" nếu
 * trong tuần này, còn lại thì "12/06/2026 14:32" — dùng cho cả mốc thời
 * gian tự động chèn giữa các cụm tin lẫn khi bấm vào 1 tin để xem giờ gửi. */
export function formatMessageTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const time = d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });

  const startOfDay = (dt: Date) => new Date(dt.getFullYear(), dt.getMonth(), dt.getDate()).getTime();
  const diffDays = Math.round((startOfDay(now) - startOfDay(d)) / 86_400_000);

  if (diffDays === 0) return time;
  if (diffDays === 1) return `Hôm qua ${time}`;
  if (diffDays > 1 && diffDays < 7) {
    const weekday = d.toLocaleDateString("vi-VN", { weekday: "long" });
    return `${weekday} ${time}`;
  }
  return `${d.toLocaleDateString("vi-VN")} ${time}`;
}

/** Tin `curr` có nên hiện mốc thời gian phía trên nó không — có nếu là tin
 * đầu tiên, hoặc cách tin trước đó (bất kể ai gửi) từ 15 phút trở lên. */
export function shouldShowTimeDivider(curr: { created_at: string }, prev?: { created_at: string }): boolean {
  if (!prev) return true;
  return new Date(curr.created_at).getTime() - new Date(prev.created_at).getTime() >= TIME_DIVIDER_GAP_MS;
}

export function decodeMessage(content: string): DecodedMessage {
  if (content.startsWith(STICKER_PREFIX)) {
    return { type: "sticker", id: content.slice(STICKER_PREFIX.length) as StickerId };
  }
  if (content.startsWith(VOICE_PREFIX)) {
    const rest = content.slice(VOICE_PREFIX.length);
    const match = rest.match(/^(.*)::(\d+)$/);
    if (match) return { type: "voice", url: match[1], duration: Number(match[2]) };
    return { type: "voice", url: rest, duration: 0 };
  }
  if (content.startsWith(IMAGE_PREFIX)) {
    const rest = content.slice(IMAGE_PREFIX.length);
    const match = rest.match(/^(.*)::(\d+)x(\d+)$/);
    if (match) {
      return { type: "image", url: match[1], width: Number(match[2]), height: Number(match[3]) };
    }
    return { type: "image", url: rest };
  }
  if (content.startsWith(GIF_PREFIX)) {
    const rest = content.slice(GIF_PREFIX.length);
    const match = rest.match(/^(.*)::(\d+)x(\d+)$/);
    if (match) {
      return { type: "gif", url: match[1], width: Number(match[2]), height: Number(match[3]) };
    }
    return { type: "gif", url: rest };
  }
  return { type: "text", text: content };
}

/** Cắt ngắn nội dung để hiện làm trích dẫn (khi reply / trong thanh ghim) —
 * sticker/ảnh/voice hiện nhãn mô tả thay vì content thô. */
export function previewLabel(content: string): string {
  const d = decodeMessage(content);
  if (d.type === "sticker") return "Nhãn dán";
  if (d.type === "image") return "📷 Hình ảnh";
  if (d.type === "gif") return "GIF";
  if (d.type === "voice") return "🎙️ Tin nhắn thoại";
  return d.text.length > 80 ? d.text.slice(0, 80) + "…" : d.text;
}
