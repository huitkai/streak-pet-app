"use client";

/**
 * Tải dữ liệu khung chat TRỰC TIẾP từ Supabase bằng client trình duyệt —
 * thay vì đi qua vòng Server Component của Next.js (browser -> Next server
 * -> Supabase -> Next server -> browser). Đi thẳng browser -> Supabase bớt
 * được 1 chặng round-trip, và quan trọng hơn: có thể gọi lại bất cứ lúc nào
 * (vd mỗi lần vào lại khung chat) để đồng bộ nền mà KHÔNG chặn UI, vì
 * ChatBox đã hiện dữ liệu cache ngay trước đó (xem lib/chat-cache.ts).
 *
 * Logic các câu query giữ đúng như app/chat/page.tsx bản gốc (đã tối ưu:
 * reactions/hidden chỉ lấy đúng theo message_id đang tải, không phình theo
 * toàn bộ lịch sử chat).
 */

import { createClient } from "@/lib/supabase/client";
import type { ChatCacheEntry } from "@/lib/chat-cache";

const PAGE_SIZE = 60;

export async function fetchLatestChatData(coupleId: string, userId: string): Promise<Omit<ChatCacheEntry, "cachedAt"> | null> {
  const supabase = createClient();

  const [{ data: latestMessagesDesc }, { data: reads }, { data: deliveries }, { data: pins }, { data: pet }] =
    await Promise.all([
      supabase
        .from("messages")
        .select("*")
        .eq("couple_id", coupleId)
        .order("created_at", { ascending: false })
        .limit(PAGE_SIZE),
      supabase.from("message_reads").select("*").eq("couple_id", coupleId),
      supabase.from("message_deliveries").select("*").eq("couple_id", coupleId),
      supabase.from("pinned_messages").select("*").eq("couple_id", coupleId),
      supabase.from("pets").select("*").eq("couple_id", coupleId).single(),
    ]);

  const messages = [...(latestMessagesDesc ?? [])].reverse();
  const messageIds = messages.map((m) => m.id);

  const [{ data: reactions }, { data: hidden }] = messageIds.length
    ? await Promise.all([
        supabase.from("message_reactions").select("*").in("message_id", messageIds),
        supabase.from("message_hidden").select("message_id").eq("user_id", userId).in("message_id", messageIds),
      ])
    : [{ data: [] as never[] }, { data: [] as never[] }];

  return {
    messages,
    reads: reads ?? [],
    deliveries: deliveries ?? [],
    reactions: reactions ?? [],
    pins: pins ?? [],
    hiddenIds: (hidden ?? []).map((h) => h.message_id),
    pet: pet ?? null,
  };
}
