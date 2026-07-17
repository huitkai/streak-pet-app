"use client";

import { previewLabel } from "@/lib/message-format";
import type { MessageRow } from "@/lib/types";
import { XIcon } from "@/components/icons";

/** Thanh trích dẫn hiển thị BÊN TRONG 1 bong bóng đã trả lời tin khác. */
export function ReplyQuoteInline({
  message,
  mine,
  onJump,
}: {
  message: MessageRow | undefined;
  mine: boolean;
  onJump?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onJump}
      className={`mb-1.5 block w-full truncate rounded-lg border-l-2 px-2 py-1 text-left text-[11px] ${
        mine
          ? "border-white/50 bg-white/10 text-white/85"
          : "border-[var(--brand)] bg-white/10 text-[var(--muted)]"
      }`}
    >
      {message ? previewLabel(message.content) : "Tin nhắn gốc"}
    </button>
  );
}

/** Thanh preview phía trên ô nhập khi đang soạn 1 tin trả lời — có nút huỷ. */
export function ReplyComposerBar({
  message,
  onCancel,
}: {
  message: MessageRow;
  onCancel: () => void;
}) {
  return (
    <div className="mb-1.5 flex items-center gap-2 rounded-xl bg-[var(--brand-light)] px-3 py-1.5">
      <div className="h-7 w-0.5 shrink-0 rounded-full bg-[var(--brand)]" />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold text-[var(--brand-dark)]">Đang trả lời</p>
        <p className="truncate text-[12px] text-[var(--muted)]">{previewLabel(message.content)}</p>
      </div>
      <button
        type="button"
        onClick={onCancel}
        aria-label="Huỷ trả lời"
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-[var(--muted)]"
      >
        <XIcon className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
