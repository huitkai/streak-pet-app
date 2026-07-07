"use client";

import { MoreIcon, PlusIcon } from "@/components/icons";

/** Bộ cảm xúc nhanh kiểu Messenger — đủ dùng cho 1 cặp đôi, không cần picker
 * emoji đầy đủ (nặng và thừa cho use-case chat 2 người). */
export const QUICK_REACTIONS = ["❤️", "😂", "😮", "😢", "🥲", "👍"] as const;

export default function ReactionPicker({
  align,
  activeEmoji,
  onSelect,
  onMore,
  onOpenFullEmoji,
}: {
  /** Bong bóng của mình căn phải -> picker cũng bung ra từ bên phải. */
  align: "left" | "right";
  activeEmoji?: string | null;
  onSelect: (emoji: string) => void;
  /** Mở MessageActionDock đầy đủ (trả lời, ghim, sửa...) — đứng riêng khỏi
   * layer chọn cảm xúc nhanh này nên không bao giờ tranh giành sự kiện chạm
   * với nó (xem ghi chú tại ChatBox.startLongPress). */
  onMore?: () => void;
  /** Mở EmojiFullPicker (mục 6) khi 6 cảm xúc nhanh không đủ — nút riêng,
   * KHÁC với `onMore` (dock), để không đụng chạm hành vi đã sửa ở bug #1. */
  onOpenFullEmoji?: () => void;
}) {
  return (
    <div
      // z-50: luôn nổi trên MessageActionDock (z-40) trong trường hợp cả hai
      // cùng hiện (giữ tiếp tục lâu hơn), để picker không bao giờ bị đè/che.
      className={`animate-pop-in absolute bottom-full z-50 mb-1.5 flex items-center gap-0.5 rounded-full bg-[var(--surface)] px-1.5 py-1 shadow-lg ring-1 ring-black/5 ${
        align === "right" ? "right-0" : "left-0"
      }`}
      style={{ transformOrigin: align === "right" ? "bottom right" : "bottom left" }}
      onClick={(e) => e.stopPropagation()}
    >
      {QUICK_REACTIONS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          onClick={() => onSelect(emoji)}
          aria-label={`Thả cảm xúc ${emoji}`}
          className={`flex h-8 w-8 items-center justify-center rounded-full text-lg transition active:scale-90 ${
            activeEmoji === emoji ? "bg-[var(--brand-light)]" : "hover:bg-black/5"
          }`}
        >
          {emoji}
        </button>
      ))}
      {onOpenFullEmoji && (
        <button
          type="button"
          onClick={onOpenFullEmoji}
          aria-label="Xem thêm emoji"
          className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--muted)] transition active:scale-90 hover:bg-black/5"
        >
          <PlusIcon className="h-4 w-4" />
        </button>
      )}
      {onMore && (
        <button
          type="button"
          onClick={onMore}
          aria-label="Thêm hành động khác"
          className="ml-0.5 flex h-8 w-8 items-center justify-center rounded-full text-[var(--muted)] transition active:scale-90 hover:bg-black/5"
        >
          <MoreIcon className="h-4.5 w-4.5" />
        </button>
      )}
    </div>
  );
}
