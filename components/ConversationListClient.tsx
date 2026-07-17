"use client";

import { useMemo, useState } from "react";
import ConversationRow from "@/components/ConversationRow";
import InstantSessionFlow from "@/components/InstantSessionFlow";
import { SearchIcon, PlusIcon, XIcon, ChatBubbleIcon } from "@/components/icons";
import type { ConversationSummary, ProfileRow } from "@/lib/types";

export default function ConversationListClient({
  conversations,
  myUserId,
  waitingInviteCode,
}: {
  conversations: ConversationSummary[];
  myUserId: string;
  myProfile?: ProfileRow | null;
  /** Nếu couple của mình chưa có đủ 2 người, truyền mã mời để hiện banner chờ. */
  waitingInviteCode: string | null;
}) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [comingSoonOpen, setComingSoonOpen] = useState(false);
  const [instantOpen, setInstantOpen] = useState(false);
  // Hiện tại app chỉ hỗ trợ đúng 1 cuộc trò chuyện (couple) — lấy id từ phần
  // tử đầu tiên. Khi mở rộng nhiều cuộc trò chuyện sẽ cần cho người dùng
  // chọn gửi vào hội thoại nào trước khi mở camera.
  const activeCoupleId = conversations[0]?.id ?? null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = !q
      ? conversations
      : conversations.filter(
          (c) => c.nickname.toLowerCase().includes(q) || c.previewText.toLowerCase().includes(q)
        );
    // Hội thoại đã ghim luôn nổi lên đầu danh sách (chưa có ý nghĩa nhiều khi
    // chỉ có 1 hội thoại duy nhất, nhưng sẵn sàng cho lúc mở rộng bạn bè/
    // người thân — xem ghi chú trong ConversationSummary).
    return [...base].sort((a, b) => Number(b.isPinned) - Number(a.isPinned));
  }, [conversations, query]);

  return (
    <div className="flex flex-1 flex-col overflow-hidden text-[var(--foreground)]">
      <header className="safe-top flex shrink-0 items-center justify-between gap-3 px-5 pb-3">
        {searchOpen ? (
          <div className="glass-pill flex flex-1 items-center gap-2 rounded-full px-4 py-2.5">
            <SearchIcon className="h-4 w-4 shrink-0 text-[var(--muted)]" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm hội thoại..."
              className="min-w-0 flex-1 bg-transparent text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--muted)]"
            />
            <button
              type="button"
              onClick={() => {
                setSearchOpen(false);
                setQuery("");
              }}
              aria-label="Đóng tìm kiếm"
              className="shrink-0 rounded-full p-1 text-[var(--muted)] transition active:scale-90"
            >
              <XIcon className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <>
            <h1 className="text-[28px] font-bold tracking-tight text-[var(--foreground)]">Chats</h1>
            <div className="flex items-center gap-2">
              {conversations.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSearchOpen(true)}
                  aria-label="Tìm hội thoại"
                  className="glass-pill flex h-10 w-10 items-center justify-center rounded-full text-[var(--foreground)] transition active:scale-90"
                >
                  <SearchIcon className="h-[17px] w-[17px]" />
                </button>
              )}

              <button
                type="button"
                onClick={() => setComingSoonOpen(true)}
                aria-label="Tạo hội thoại mới"
                className="glass-pill flex h-10 w-10 items-center justify-center rounded-full text-[var(--foreground)] transition active:scale-90"
              >
                <PlusIcon className="h-[17px] w-[17px]" />
              </button>
            </div>
          </>
        )}
      </header>

      <div className="flex-1 overflow-y-auto px-3 pb-4">
        {waitingInviteCode ? (
          <div className="glass-surface mx-1 mt-4 rounded-3xl p-5 text-center">
            <p className="text-sm text-[var(--muted)]">
              Đang chờ người ấy tham gia bằng mã mời{" "}
              <span className="font-bold text-[var(--brand)]">{waitingInviteCode}</span>
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="mx-4 mt-10 flex flex-col items-center text-center">
            <ChatBubbleIcon className="h-9 w-9 text-[var(--muted)]" />
            <p className="mt-2 text-sm text-[var(--muted)]">
              {query ? "Không tìm thấy hội thoại nào phù hợp." : "Chưa có hội thoại nào."}
            </p>
          </div>
        ) : (
          filtered.map((c) => <ConversationRow key={c.id} conversation={c} myUserId={myUserId} />)
        )}

        {/* Chỗ này sau này sẽ liệt kê thêm các cuộc trò chuyện khác:
            bạn bè, anh chị em... — chỉ cần đổ thêm vào mảng `conversations`. */}
      </div>

      {/* Nút "+" nổi kiểu Messenger — bấm vào MỞ THẲNG CAMERA, không qua menu
          trung gian nào. Đặt trên MobileTabBar (chỉ hiện <768px) nên chỉ
          hiện ở mobile, giống đúng vị trí trong ảnh tham khảo. */}
      {activeCoupleId && (
        <button
          type="button"
          onClick={() => setInstantOpen(true)}
          aria-label="Chụp ảnh tức thì"
          className="safe-bottom fixed bottom-24 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--brand)] text-white shadow-[0_8px_24px_rgba(240,149,74,0.45)] transition active:scale-90 md:hidden"
        >
          <PlusIcon className="h-6 w-6" strokeWidth={2.2} />
        </button>
      )}

      {comingSoonOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setComingSoonOpen(false)} aria-hidden />
          <div className="glass-surface safe-bottom animate-sheet-up relative w-full max-w-md rounded-t-3xl p-6 text-center shadow-xl">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--brand-light)] text-[var(--brand)]">
              <ChatBubbleIcon className="h-6 w-6" />
            </div>
            <h2 className="mt-3 text-base font-bold text-[var(--foreground)]">Sắp ra mắt</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Trò chuyện với bạn bè và người thân đang được phát triển — hiện app chỉ hỗ trợ 1 cuộc trò
              chuyện với người ấy của bạn.
            </p>
            <button
              type="button"
              onClick={() => setComingSoonOpen(false)}
              className="mt-4 w-full rounded-xl bg-[var(--brand)] py-2.5 text-sm font-semibold text-white transition active:scale-95"
            >
              Đã hiểu
            </button>
          </div>
        </div>
      )}

      {instantOpen && activeCoupleId && (
        <InstantSessionFlow
          coupleId={activeCoupleId}
          userId={myUserId}
          conversations={conversations}
          onClose={() => setInstantOpen(false)}
        />
      )}
    </div>
  );
}
