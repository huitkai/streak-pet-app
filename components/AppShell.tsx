"use client";

import { useEffect, useState } from "react";
import ConversationListClient from "@/components/ConversationListClient";
import EmptyChatState from "@/components/EmptyChatState";
import type { ConversationSummary, ProfileRow } from "@/lib/types";

type SidebarData = {
  conversations: ConversationSummary[];
  myProfile: ProfileRow | null;
  myUserId: string;
  waitingInviteCode: string | null;
};

/**
 * Layout 2 cột cho PC/tablet (>=768px), giữ nguyên hành vi 1 cột full-screen
 * trên mobile. Xem "Bối cảnh kỹ thuật" trong tài liệu kế hoạch cho lý do
 * chọn client wrapper thay vì parallel routes.
 *
 * - mode="list" (trang `/`): `children` (danh sách hội thoại) được dùng
 *   trực tiếp làm nội dung cột trái trên desktop — không fetch lại lần 2.
 *   Cột phải hiện empty-state.
 * - mode="chat" (trang `/chat`): `children` (khung chat) là nội dung cột
 *   phải. Cột trái cần danh sách hội thoại nhưng `chat/page.tsx` không có
 *   sẵn dữ liệu này, nên gọi nhẹ `/api/conversations` — CHỈ khi đang ở
 *   desktop, tránh lãng phí round-trip trên mobile nơi sidebar bị ẩn.
 */
export default function AppShell({
  mode,
  children,
}: {
  mode: "list" | "chat";
  children: React.ReactNode;
}) {
  const [sidebarData, setSidebarData] = useState<SidebarData | null>(null);

  useEffect(() => {
    if (mode !== "chat") return;
    if (typeof window === "undefined") return;
    if (!window.matchMedia("(min-width: 768px)").matches) return;

    let cancelled = false;
    fetch("/api/conversations")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data) setSidebarData(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [mode]);

  return (
    <div className="flex flex-1 flex-col overflow-hidden md:grid md:grid-cols-[380px_1fr]">
      <div
        className={
          mode === "list"
            ? "flex flex-1 flex-col overflow-hidden md:border-r md:border-[var(--border)]"
            : "hidden overflow-hidden md:flex md:flex-col md:border-r md:border-[var(--border)]"
        }
      >
        {mode === "list" ? (
          children
        ) : sidebarData ? (
          <ConversationListClient
            conversations={sidebarData.conversations}
            myUserId={sidebarData.myUserId}
            myProfile={sidebarData.myProfile}
            waitingInviteCode={sidebarData.waitingInviteCode}
          />
        ) : (
          <div className="flex flex-1 items-center justify-center text-sm text-[var(--muted)]">Đang tải…</div>
        )}
      </div>

      <div
        className={
          mode === "list" ? "hidden md:flex md:flex-col md:overflow-hidden" : "flex flex-1 flex-col overflow-hidden"
        }
      >
        {mode === "list" ? <EmptyChatState /> : children}
      </div>
    </div>
  );
}
