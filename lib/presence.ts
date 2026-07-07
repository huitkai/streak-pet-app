"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Trạng thái hoạt động thật của người dùng — thay cho dòng chữ tĩnh
 * "cùng nuôi lớn 🐾" trước đây. Có 2 lớp thông tin:
 *
 * 1. "Đang hoạt động" (realtime): dựa vào Supabase Realtime Presence — mỗi
 *    tab đang mở khung chat sẽ "track" chính mình vào 1 channel theo couple,
 *    nên biết NGAY khi đối phương đang mở app cùng lúc, không cần polling DB.
 * 2. "Hoạt động X trước" (last_seen): fallback khi đối phương không có mặt
 *    trong channel — lấy từ cột profiles.last_seen, được ghi định kỳ bởi
 *    usePresenceHeartbeat mỗi khi họ mở/tương tác với app.
 */

const HEARTBEAT_INTERVAL_MS = 25_000;

/** Gắn vào 1 component luôn mount khi user đang ở trong app (vd ChatBox) để
 * định kỳ ghi lại "mình vừa hoạt động" vào profiles.last_seen. */
export function usePresenceHeartbeat(userId: string) {
  useEffect(() => {
    if (!userId) return;
    const supabase = createClient();

    async function beat() {
      if (document.visibilityState === "hidden") return;
      await supabase.from("profiles").update({ last_seen: new Date().toISOString() }).eq("id", userId);
    }

    beat();
    const interval = window.setInterval(beat, HEARTBEAT_INTERVAL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") beat();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    window.addEventListener("beforeunload", () => {
      // best-effort, không chặn unload
      void beat();
    });

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [userId]);
}

/**
 * QUAN TRỌNG: nhiều nơi trong UI cùng mount `usePartnerOnline` cho CÙNG 1
 * coupleId trong cùng 1 lúc (vd: ChatHeader của khung chat + ConversationRow
 * trong danh sách hội thoại ở layout 2 cột trên PC). Nếu mỗi hook tự tạo
 * riêng 1 `supabase.channel(\`presence-${coupleId}\`)` thì 2 channel trùng
 * tên (trùng "topic") sẽ đụng nhau: channel thứ 2 gọi `.on(...)` SAU KHI
 * channel thứ 1 (cùng topic) đã `.subscribe()` xong, dẫn tới lỗi
 * "cannot add `presence` callbacks ... after `subscribe()`" và làm sập cả
 * trang (đúng lỗi khi bấm vào 1 đoạn chat trên PC).
 *
 * Giải pháp: dùng 1 channel DÙNG CHUNG cho mỗi coupleId, đếm số hook đang
 * "thuê" (refcount), chỉ tạo/subscribe channel khi hook đầu tiên mount và
 * chỉ removeChannel khi hook cuối cùng unmount.
 */
type PresenceEntry = {
  channel: ReturnType<ReturnType<typeof createClient>["channel"]>;
  listeners: Set<() => void>;
  refCount: number;
};
const presenceChannels = new Map<string, PresenceEntry>();

function subscribeToPartnerPresence(coupleId: string, userId: string, onSync: () => void): () => void {
  let entry = presenceChannels.get(coupleId);

  if (!entry) {
    const supabase = createClient();
    const channel = supabase.channel(`presence-${coupleId}`, {
      config: { presence: { key: userId } },
    });
    const listeners = new Set<() => void>();

    channel
      .on("presence", { event: "sync" }, () => {
        listeners.forEach((cb) => cb());
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ online_at: new Date().toISOString() });
          listeners.forEach((cb) => cb());
        }
      });

    entry = { channel, listeners, refCount: 0 };
    presenceChannels.set(coupleId, entry);
  }

  entry.refCount += 1;
  entry.listeners.add(onSync);

  return () => {
    const current = presenceChannels.get(coupleId);
    if (!current) return;
    current.listeners.delete(onSync);
    current.refCount -= 1;
    if (current.refCount <= 0) {
      const supabase = createClient();
      supabase.removeChannel(current.channel);
      presenceChannels.delete(coupleId);
    }
  };
}

/** Theo dõi xem đối phương có đang "có mặt" (mở app) ngay lúc này không,
 * qua Supabase Realtime Presence — không cần cột DB, tự dọn dẹp khi rời trang. */
export function usePartnerOnline(coupleId: string, userId: string, partnerId: string | null): boolean {
  const [online, setOnline] = useState(false);

  useEffect(() => {
    if (!coupleId || !partnerId) return;

    const checkState = () => {
      const entry = presenceChannels.get(coupleId);
      const state = entry?.channel.presenceState<{ online_at: string }>();
      setOnline(Boolean(state?.[partnerId]?.length));
    };

    const unsubscribe = subscribeToPartnerPresence(coupleId, userId, checkState);
    checkState();

    return unsubscribe;
  }, [coupleId, userId, partnerId]);

  return online;
}

/** Thời gian im lặng (ms) trước khi tự coi là "ngừng gõ" nếu không nhận được
 * tín hiệu dừng rõ ràng (vd người kia đóng app đột ngột, mất mạng...). */
const TYPING_STALE_MS = 4_000;
/** Không bắn sự kiện "đang gõ" liên tục mỗi phím — chỉ bắn lại tối đa 1 lần
 * mỗi khoảng này để đỡ tốn băng thông realtime. */
const TYPING_THROTTLE_MS = 2_000;

/**
 * "Đang nhập..." kiểu Messenger — dùng Supabase Realtime Broadcast (kênh
 * ephemeral, KHÔNG ghi DB) thay vì postgres_changes, vì đây là tín hiệu
 * tức thời không cần lưu lại lịch sử.
 *
 * Trả về:
 * - partnerTyping: đối phương có đang gõ hay không
 * - notifyTyping(isTyping): gọi mỗi khi input của MÌNH thay đổi nội dung
 *   (isTyping=true khi còn ký tự, false khi xoá trắng/gửi xong)
 */
export function useTypingIndicator(
  coupleId: string,
  userId: string
): [boolean, (isTyping: boolean) => void] {
  const [partnerTyping, setPartnerTyping] = useState(false);
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null);
  const staleTimerRef = useRef<number | undefined>(undefined);
  const lastSentRef = useRef(0);
  const lastIsTypingRef = useRef(false);

  useEffect(() => {
    if (!coupleId) return;
    const supabase = createClient();
    const channel = supabase.channel(`typing-${coupleId}`, {
      config: { broadcast: { self: false } },
    });

    channel
      .on("broadcast", { event: "typing" }, (msg) => {
        const payload = msg.payload as { userId: string; typing: boolean };
        if (payload.userId === userId) return; // bỏ qua tín hiệu của chính mình
        window.clearTimeout(staleTimerRef.current);
        if (payload.typing) {
          setPartnerTyping(true);
          // Tự tắt sau 1 khoảng nếu không nhận thêm tín hiệu nào — phòng
          // trường hợp sự kiện "đã dừng gõ" bị rớt (mất mạng, thoát app...).
          staleTimerRef.current = window.setTimeout(() => setPartnerTyping(false), TYPING_STALE_MS);
        } else {
          setPartnerTyping(false);
        }
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      window.clearTimeout(staleTimerRef.current);
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [coupleId, userId]);

  function notifyTyping(isTyping: boolean) {
    const channel = channelRef.current;
    if (!channel) return;
    const now = Date.now();

    // Luôn bắn ngay khi chuyển từ "đang gõ" -> "dừng gõ" (vd sau khi gửi),
    // để đối phương thấy chỉ báo biến mất tức thì thay vì phải chờ hết
    // khoảng throttle hoặc chờ timeout tự động.
    const isStopSignal = !isTyping && lastIsTypingRef.current;
    if (!isStopSignal && isTyping && now - lastSentRef.current < TYPING_THROTTLE_MS) return;

    lastSentRef.current = now;
    lastIsTypingRef.current = isTyping;
    channel.send({ type: "broadcast", event: "typing", payload: { userId, typing: isTyping } });
  }

  return [partnerTyping, notifyTyping];
}

/** "Vừa mới hoạt động" / "Hoạt động 5 phút trước" / "Hoạt động lúc 14:30" ... */
export function formatLastSeen(lastSeen: string | null | undefined): string {
  if (!lastSeen) return "Không rõ hoạt động";
  const then = new Date(lastSeen).getTime();
  const diffMs = Date.now() - then;
  const diffMin = Math.floor(diffMs / 60_000);

  if (diffMin < 1) return "Vừa mới hoạt động";
  if (diffMin < 60) return `Hoạt động ${diffMin} phút trước`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `Hoạt động ${diffHour} giờ trước`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay === 1) return "Hoạt động hôm qua";
  if (diffDay < 7) return `Hoạt động ${diffDay} ngày trước`;
  return `Hoạt động ${new Date(lastSeen).toLocaleDateString("vi-VN")}`;
}
