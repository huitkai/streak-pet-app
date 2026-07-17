"use client";

import { useMemo, useState } from "react";
import ConversationRow from "@/components/ConversationRow";
import InstantSessionFlow from "@/components/InstantSessionFlow";
import { CameraIcon, SearchIcon, UserPlusIcon, XIcon, ChatBubbleIcon } from "@/components/icons";
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
    <div className="flex flex-1 flex-col overflow-hidden">
      <header className="glass-surface-strong flex shrink-0 items-center justify-between gap-2 border-b px-4 pb-2 pt-3 shadow-glass safe-top">
        <span className="gradient-text text-[22px] font-extrabold tracking-tight">Streak&nbsp;Pet</span>
        <button
          type="button"
          onClick={() => setComingSoonOpen(true)}
          aria-label="Thêm bạn bè"
          className="gradient-brand flex h-9 w-9 items-center justify-center rounded-full text-white shadow-float transition active:scale-90"
        >
          <UserPlusIcon className="h-[18px] w-[18px]" strokeWidth={2} />
        </button>
      </header>

      {/* Thanh tìm kiếm tách riêng thành 1 hàng cố định ngay dưới header,
          giống Messenger — không còn ẩn/hiện dạng overlay như trước. */}
      <div className="glass-surface shrink-0 border-b px-4 py-2.5">
        <div className="flex items-center gap-2 rounded-full bg-black/[0.045] px-3.5 py-2.5">
          <SearchIcon className="h-4 w-4 shrink-0 text-[var(--muted)]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm hội thoại..."
            className="min-w-0 flex-1 bg-transparent text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--muted)]"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Xoá tìm kiếm"
              className="shrink-0 rounded-full p-0.5 text-[var(--muted)] transition active:scale-90"
            >
              <XIcon className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {waitingInviteCode ? (
          <div className="gradient-brand-soft mx-4 mt-6 rounded-2xl border border-dashed border-[var(--border)] p-5 text-center">
            <p className="text-sm text-[var(--muted)]">
              Đang chờ người ấy tham gia bằng mã mời{" "}
              <span className="gradient-text font-bold">{waitingInviteCode}</span>
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="mx-4 mt-10 flex flex-col items-center text-center">
            <div className="gradient-brand-soft flex h-16 w-16 items-center justify-center rounded-full">
              <ChatBubbleIcon className="h-8 w-8 text-[var(--brand-dark)]" />
            </div>
            <p className="mt-3 text-sm text-[var(--muted)]">
              {query ? "Không tìm thấy hội thoại nào phù hợp." : "Chưa có hội thoại nào."}
            </p>
          </div>
        ) : (
          filtered.map((c) => <ConversationRow key={c.id} conversation={c} myUserId={myUserId} />)
        )}

        {/* Chỗ này sau này sẽ liệt kê thêm các cuộc trò chuyện khác:
            bạn bè, anh chị em... — chỉ cần đổ thêm vào mảng `conversations`. */}
      </div>

      {/* Nút chụp nhanh — thiết kế kiểu "ống kính" nhiều lớp để rõ ràng là
          MỞ CAMERA (không phải "tạo mới" chung chung như trước), có quầng
          sáng nhấp nháy nhẹ để dễ nhận ra là điểm chạm chính của màn hình. */}
      {activeCoupleId && (
        <button
          type="button"
          onClick={() => setInstantOpen(true)}
          aria-label="Chụp ảnh tức thì"
          className="safe-bottom fixed bottom-24 right-5 z-30 flex h-16 w-16 items-center justify-center transition active:scale-90 md:hidden"
        >
          <span className="gradient-brand-soft absolute inset-[-6px] animate-pulse-ring rounded-full" aria-hidden />
          <span className="glass-surface-strong absolute inset-0 rounded-full border shadow-float" aria-hidden />
          <span className="gradient-brand relative flex h-[52px] w-[52px] items-center justify-center rounded-full text-white">
            <CameraIcon className="h-6 w-6" strokeWidth={1.9} />
          </span>
        </button>
      )}

      {comingSoonOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/35" onClick={() => setComingSoonOpen(false)} aria-hidden />
          <div className="glass-surface-strong safe-bottom animate-sheet-up relative w-full max-w-md rounded-t-3xl border p-6 text-center shadow-xl">
            <div className="gradient-brand mx-auto flex h-12 w-12 items-center justify-center rounded-full text-white shadow-float">
              <UserPlusIcon className="h-6 w-6" />
            </div>
            <h2 className="mt-3 text-base font-bold text-[var(--foreground)]">Sắp ra mắt</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Thêm bạn bè và người thân vào trò chuyện đang được phát triển — hiện app chỉ hỗ trợ 1 cuộc
              trò chuyện với người ấy của bạn.
            </p>
            <button
              type="button"
              onClick={() => setComingSoonOpen(false)}
              className="gradient-brand mt-4 w-full rounded-xl py-2.5 text-sm font-semibold text-white shadow-float transition active:scale-95"
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
