"use client";

import { useEffect, useMemo, useState } from "react";
import ConversationRow from "@/components/ConversationRow";
import InstantSessionFlow from "@/components/InstantSessionFlow";
import Avatar from "@/components/Avatar";
import { SearchIcon, ChatBubbleIcon } from "@/components/icons";
import type { ConversationSummary, ProfileRow } from "@/lib/types";

// Nhãn tab đúng theo mockup (01-chat-list.html): All / Personal / Groups /
// Unanswered — kiểu gạch chân bên dưới tab đang chọn, KHÔNG còn dạng pill
// filled như trước. "groups" hiện chưa có nguồn dữ liệu (app chưa có khái
// niệm nhóm) nên luôn rỗng kèm empty-state riêng — chỉ cần đổ thêm dữ liệu
// group vào `conversations` (type: "group") sau này là tab này chạy được
// ngay, không cần sửa lại UI.
const TABS = [
  { key: "all", label: "All" },
  { key: "personal", label: "Personal" },
  { key: "groups", label: "Groups" },
  { key: "unanswered", label: "Unanswered" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

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
  const [tab, setTab] = useState<TabKey>("all");
  const [advancedSearchOpen, setAdvancedSearchOpen] = useState(false);
  const [instantOpen, setInstantOpen] = useState(false);
  // Hiện tại app chỉ hỗ trợ đúng 1 cuộc trò chuyện (couple) — lấy id từ phần
  // tử đầu tiên. Khi mở rộng nhiều cuộc trò chuyện sẽ cần cho người dùng
  // chọn gửi vào hội thoại nào trước khi mở camera.
  const activeCoupleId = conversations[0]?.id ?? null;

  useEffect(() => {
    if (!activeCoupleId) return;
    const handler = () => setInstantOpen(true);
    window.addEventListener("sp:open-camera", handler);
    return () => window.removeEventListener("sp:open-camera", handler);
  }, [activeCoupleId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let base = !q
      ? conversations
      : conversations.filter(
          (c) => c.nickname.toLowerCase().includes(q) || c.previewText.toLowerCase().includes(q)
        );
    if (tab === "personal") base = base.filter((c) => c.type === "couple" || c.type === "friend" || c.type === "family");
    // TODO: chưa có type "group" trong ConversationSummary/DB — khi có, lọc
    // ở đây (c.type === "group"). Hiện luôn rỗng, hiển thị empty-state riêng.
    if (tab === "groups") base = [];
    if (tab === "unanswered") base = base.filter((c) => c.unreadCount > 0);
    // Hội thoại đã ghim luôn nổi lên đầu danh sách.
    return [...base].sort((a, b) => Number(b.isPinned) - Number(a.isPinned));
  }, [conversations, query, tab]);

  return (
    <div className="flex flex-1 flex-col overflow-hidden text-[var(--foreground)]">
      <header className="safe-top flex shrink-0 items-center justify-between gap-3 px-5 pb-4">
        <h1 className="text-[28px] font-bold tracking-tight text-[var(--foreground)]">Chats</h1>
        <button
          type="button"
          onClick={() => setAdvancedSearchOpen(true)}
          aria-label="Tìm kiếm nâng cao"
          className="glass-pill flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--foreground)] transition active:scale-90"
        >
          <SearchIcon className="h-[17px] w-[17px]" />
        </button>
      </header>

      {/* Ô tìm kiếm luôn hiển thị (không còn ẩn/hiện qua icon) — đúng bố cục
          mockup, nơi search box nằm cố định ngay dưới tiêu đề "Chats". */}
      <div className="shrink-0 px-5 pb-4">
        <div className="glass-pill flex items-center gap-2.5 rounded-2xl px-4 py-3">
          <SearchIcon className="h-4 w-4 shrink-0 text-[var(--muted)]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm kiếm"
            className="min-w-0 flex-1 bg-transparent text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--muted)]"
          />
        </div>
      </div>

      {/* Tabs dạng gạch chân, không phải pill — đúng .tabs trong mockup. */}
      <div className="thin-scroll flex shrink-0 items-center gap-6 overflow-x-auto px-5 pb-4">
        {TABS.map(({ key, label }) => {
          const active = tab === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`shrink-0 border-b-2 pb-1.5 text-[15px] transition ${
                active
                  ? "border-[var(--foreground)] font-bold text-[var(--foreground)]"
                  : "border-transparent font-medium text-[var(--muted)]"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Hàng "stories" (avatar viền gradient + badge số) giống mockup —
          TODO: chưa có tính năng story/khoảnh khắc thật, đang tạm dùng lại
          avatar + unreadCount của chính cuộc trò chuyện làm placeholder có
          dữ liệu thật (không phải số giả), thay bằng nguồn story riêng khi
          tính năng đó được xây dựng. */}
      {conversations.length > 0 && (
        <div className="thin-scroll flex shrink-0 items-center gap-4 overflow-x-auto px-5 pb-5">
          {conversations.map((c) => (
            <button
              key={`story-${c.id}`}
              type="button"
              onClick={() => (window.location.href = "/chat")}
              aria-label={`Xem story của ${c.nickname}`}
              className="relative h-[58px] w-[58px] shrink-0 transition active:scale-95"
            >
              <span className="avatar-ring-online block h-full w-full rounded-full p-[2.5px]">
                <span className="block h-full w-full rounded-full border-[2.5px] border-[var(--background)]">
                  <Avatar url={c.partnerProfile?.avatar_url} name={c.nickname} size={53} />
                </span>
              </span>
              {c.unreadCount > 0 && (
                <span className="unread-dot absolute -right-1 -top-1 flex h-[19px] min-w-[19px] items-center justify-center rounded-full border-2 border-[var(--background)] px-1 text-[11px] font-bold text-white">
                  {c.unreadCount > 99 ? "99+" : c.unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Section label + sub — đúng nhịp "People / Friends' recommendations"
          trong mockup. TODO: app hiện chưa có khái niệm gợi ý bạn bè, dùng
          nhãn trung tính phù hợp với app chat 1-1 hiện tại; đổi lại khi có
          tính năng gợi ý thật. */}
      {conversations.length > 0 && (
        <div className="shrink-0 px-5 pb-1">
          <h2 className="text-[21px] font-bold text-[var(--foreground)]">Trò chuyện</h2>
          <p className="pb-1 text-[13px] text-[var(--muted)]">Các cuộc trò chuyện gần đây</p>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-3 pb-4 pt-2">
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
              {tab === "groups"
                ? "Chưa có nhóm nào — tính năng nhóm sẽ sớm ra mắt."
                : query
                  ? "Không tìm thấy hội thoại nào phù hợp."
                  : "Chưa có hội thoại nào."}
            </p>
          </div>
        ) : (
          filtered.map((c) => <ConversationRow key={c.id} conversation={c} myUserId={myUserId} />)
        )}

        {/* Chỗ này sau này sẽ liệt kê thêm các cuộc trò chuyện khác:
            bạn bè, anh chị em... — chỉ cần đổ thêm vào mảng `conversations`. */}
      </div>

      {/* Nút chụp nhanh giờ nằm trong MobileTabBar (hàng nút nổi màu trắng,
          icon camera) — ở đây chỉ lắng nghe sự kiện "sp:open-camera" mà
          MobileTabBar phát ra khi bấm, để mở InstantSessionFlow bên dưới. */}

      {advancedSearchOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setAdvancedSearchOpen(false)} aria-hidden />
          <div className="glass-surface safe-bottom animate-sheet-up relative w-full max-w-md rounded-t-3xl p-6 text-center shadow-xl">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--brand-light)] text-[var(--brand)]">
              <SearchIcon className="h-6 w-6" />
            </div>
            <h2 className="mt-3 text-base font-bold text-[var(--foreground)]">Tìm kiếm nâng cao</h2>
            {/* TODO: chưa có bộ lọc nâng cao thật (theo ngày, theo loại tin
                nhắn...) — đây là chỗ đặt sẵn UI, nối logic lọc thật sau. */}
            <p className="mt-1 text-sm text-[var(--muted)]">
              Bộ lọc tìm kiếm nâng cao đang được phát triển — hiện dùng ô tìm kiếm phía trên để lọc theo tên.
            </p>
            <button
              type="button"
              onClick={() => setAdvancedSearchOpen(false)}
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
