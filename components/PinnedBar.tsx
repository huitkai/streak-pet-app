"use client";

import { useState } from "react";
import { previewLabel } from "@/lib/message-format";
import type { MessageRow, PinnedMessageRow } from "@/lib/types";
import { PinIcon, XIcon, ChevronDownIcon } from "@/components/icons";

/** Thanh ghim gọn, đặt ngay dưới header — bấm để mở danh sách đầy đủ. */
export default function PinnedBar({
  pins,
  messageMap,
  onJump,
  onUnpin,
}: {
  pins: PinnedMessageRow[];
  messageMap: Map<string, MessageRow>;
  onJump: (messageId: string) => void;
  onUnpin: (messageId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  if (pins.length === 0) return null;

  const latest = pins[pins.length - 1];
  const latestMsg = messageMap.get(latest.message_id);

  return (
    <div className="relative z-10 border-b border-[var(--border)] bg-[var(--brand-light)]">
      <button
        type="button"
        onClick={() => (pins.length > 1 ? setExpanded((v) => !v) : onJump(latest.message_id))}
        className="flex w-full items-center gap-2 px-3 py-1.5 text-left active:opacity-80"
      >
        <PinIcon className="h-3.5 w-3.5 shrink-0 text-[var(--brand-dark)]" filled />
        <span className="min-w-0 flex-1 truncate text-[12px] text-[var(--brand-dark)]">
          {latestMsg ? previewLabel(latestMsg.content) : "Tin nhắn đã ghim"}
        </span>
        {pins.length > 1 && (
          <span className="flex shrink-0 items-center gap-0.5 text-[11px] font-semibold text-[var(--brand-dark)]">
            {pins.length}
            <ChevronDownIcon className={`h-3 w-3 transition-transform ${expanded ? "rotate-180" : ""}`} />
          </span>
        )}
      </button>

      {expanded && (
        <div className="thin-scroll max-h-52 overflow-y-auto border-t border-white/10 bg-[var(--surface)]">
          {[...pins].reverse().map((p) => {
            const msg = messageMap.get(p.message_id);
            return (
              <div key={p.message_id} className="flex items-center gap-2 px-3 py-2 active:bg-white/10">
                <button
                  type="button"
                  onClick={() => {
                    setExpanded(false);
                    onJump(p.message_id);
                  }}
                  className="min-w-0 flex-1 truncate text-left text-[12.5px] text-[var(--foreground)]"
                >
                  {msg ? previewLabel(msg.content) : "Tin nhắn đã ghim"}
                </button>
                <button
                  type="button"
                  onClick={() => onUnpin(p.message_id)}
                  aria-label="Bỏ ghim"
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-[var(--muted)]"
                >
                  <XIcon className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
