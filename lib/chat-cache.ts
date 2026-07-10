"use client";

/**
 * Cache dữ liệu khung chat (tin nhắn + reads/deliveries/reactions/pins/ẩn)
 * theo từng coupleId — mục tiêu: vào khung chat lần 2 trở đi (thoát ra rồi
 * vào lại) HIỆN NGAY dữ liệu cũ đã có, không phải chờ tải lại từ đầu, trong
 * lúc đó mới âm thầm đồng bộ dữ liệu mới nhất phía sau (stale-while-revalidate).
 *
 * 2 lớp lưu trữ:
 * 1. Bộ nhớ (Map ở module scope) — sống suốt phiên SPA, phục vụ chuyển
 *    trang qua lại giữa danh sách hội thoại <-> khung chat (Next.js client
 *    navigation không nạp lại JS nên Map này không bị mất).
 * 2. sessionStorage — dự phòng cho trường hợp tab bị tải lại (F5, hoặc
 *    Capacitor webview reload) nhưng vẫn cùng phiên trình duyệt: đọc lại từ
 *    đây để có dữ liệu hiện ngay thay vì màn hình trắng/skeleton.
 *
 * Chỉ lưu dữ liệu dạng text/JSON nhỏ (không lưu blob ảnh) nên rất nhẹ.
 */

import type {
  MessageRow,
  MessageReadRow,
  MessageDeliveryRow,
  ReactionRow,
  PinnedMessageRow,
  PetRow,
} from "@/lib/types";

export interface ChatCacheEntry {
  messages: MessageRow[];
  reads: MessageReadRow[];
  deliveries: MessageDeliveryRow[];
  reactions: ReactionRow[];
  pins: PinnedMessageRow[];
  hiddenIds: string[];
  pet: PetRow | null;
  /** Thời điểm cache được ghi — dùng để hiển thị nhẹ nhàng việc đây là dữ
   * liệu "đang chờ đồng bộ lại" nếu cần, hiện chưa dùng tới trong UI. */
  cachedAt: number;
}

const STORAGE_PREFIX = "chat-cache:";
const memoryCache = new Map<string, ChatCacheEntry>();

function storageKey(coupleId: string) {
  return `${STORAGE_PREFIX}${coupleId}`;
}

/** Đọc cache — ưu tiên bộ nhớ (nhanh nhất), rơi về sessionStorage nếu bộ nhớ
 * chưa có (ví dụ sau khi tải lại trang). */
export function getCachedChat(coupleId: string): ChatCacheEntry | null {
  const fromMemory = memoryCache.get(coupleId);
  if (fromMemory) return fromMemory;

  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(storageKey(coupleId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ChatCacheEntry;
    memoryCache.set(coupleId, parsed);
    return parsed;
  } catch {
    return null;
  }
}

/** Ghi đè toàn bộ cache cho 1 coupleId — dùng sau khi fetch mới nhất xong. */
export function setCachedChat(coupleId: string, entry: Omit<ChatCacheEntry, "cachedAt">): void {
  const full: ChatCacheEntry = { ...entry, cachedAt: Date.now() };
  memoryCache.set(coupleId, full);
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(storageKey(coupleId), JSON.stringify(full));
  } catch {
    // sessionStorage đầy hoặc bị chặn (chế độ ẩn danh) — bỏ qua, cache bộ
    // nhớ vẫn hoạt động bình thường trong phiên hiện tại.
  }
}

/** Cập nhật 1 phần cache (vd chỉ messages thay đổi) mà không cần đọc/ghi lại
 * toàn bộ — dùng để cache luôn "bắt kịp" state hiện tại của ChatBox mỗi khi
 * có gì đó thay đổi (tin mới, reaction, ghim...). */
export function patchCachedChat(coupleId: string, patch: Partial<Omit<ChatCacheEntry, "cachedAt">>): void {
  const existing = memoryCache.get(coupleId);
  const base: Omit<ChatCacheEntry, "cachedAt"> = existing ?? {
    messages: [],
    reads: [],
    deliveries: [],
    reactions: [],
    pins: [],
    hiddenIds: [],
    pet: null,
  };
  setCachedChat(coupleId, { ...base, ...patch });
}

export function clearCachedChat(coupleId: string): void {
  memoryCache.delete(coupleId);
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(storageKey(coupleId));
  } catch {
    // ignore
  }
}
