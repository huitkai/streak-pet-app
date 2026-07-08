"use client";

/**
 * Bảng chọn người nhận khi bấm "Chia sẻ" trong màn xem ảnh tức thì
 * (InstantPhotoViewer). Hiện tại app chỉ hỗ trợ 1 cuộc trò chuyện/couple nên
 * danh sách chỉ có đúng 1 dòng — nhưng dựng sẵn dạng multi-select để không
 * phải viết lại UI khi app hỗ trợ nhiều hội thoại (bạn bè, gia đình...).
 */

import { useState } from "react";
import Avatar from "@/components/Avatar";
import { CheckIcon, XIcon, SendIcon } from "@/components/icons";
import type { ConversationSummary } from "@/lib/types";

export default function RecipientPickerSheet({
  conversations,
  defaultSelectedId,
  sending,
  onClose,
  onConfirm,
}: {
  conversations: ConversationSummary[];
  /** Cuộc trò chuyện đang mở sẵn từ trước — mặc định tick sẵn cho nhanh. */
  defaultSelectedId?: string | null;
  sending: boolean;
  onClose: () => void;
  onConfirm: (recipientIds: string[]) => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(defaultSelectedId ? [defaultSelectedId] : [])
  );

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden />
      <div className="safe-bottom animate-sheet-up relative w-full max-w-md rounded-t-3xl bg-[var(--surface)] shadow-xl">
        <div className="flex items-center justify-between px-5 pt-4">
          <h2 className="text-base font-bold text-[var(--foreground)]">Chia sẻ với...</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--muted)] transition active:scale-90 active:bg-black/5"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[50vh] overflow-y-auto px-3 py-2">
          {conversations.map((c) => {
            const isSelected = selected.has(c.id);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => toggle(c.id)}
                className="flex w-full items-center gap-3 rounded-2xl px-2 py-2.5 text-left transition active:scale-[0.98] active:bg-black/5"
              >
                <Avatar url={c.partnerProfile?.avatar_url} name={c.nickname} size={44} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-[var(--foreground)]">{c.nickname}</p>
                  <p className="truncate text-xs text-[var(--muted)]">{c.petName}</p>
                </div>
                <div
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${
                    isSelected
                      ? "border-[var(--brand)] bg-[var(--brand)]"
                      : "border-[var(--border)] bg-transparent"
                  }`}
                >
                  {isSelected && <CheckIcon className="h-3.5 w-3.5 text-white" strokeWidth={3} />}
                </div>
              </button>
            );
          })}

          {conversations.length === 0 && (
            <p className="px-2 py-6 text-center text-sm text-[var(--muted)]">Chưa có cuộc trò chuyện nào.</p>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 px-5 py-4">
          <p className="text-xs text-[var(--muted)]">
            {selected.size > 0 ? `Đã chọn ${selected.size} người` : "Chưa chọn ai"}
          </p>
          <button
            type="button"
            onClick={() => onConfirm(Array.from(selected))}
            disabled={selected.size === 0 || sending}
            className="flex items-center gap-1.5 rounded-full bg-[var(--brand)] px-5 py-2.5 text-sm font-semibold text-white transition active:scale-95 disabled:opacity-40"
          >
            {sending ? "Đang gửi..." : "Gửi"}
            <SendIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
