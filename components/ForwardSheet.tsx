"use client";

import { useEffect, useState } from "react";
import { listMyConversations, forwardMessage } from "@/lib/actions";
import { XIcon, ForwardMsgIcon } from "@/components/icons";

interface ConversationOption {
  id: string;
  pet_name: string;
  user1_id: string;
  user2_id: string | null;
}

export default function ForwardSheet({
  messageId,
  currentCoupleId,
  onClose,
}: {
  messageId: string;
  currentCoupleId: string;
  onClose: () => void;
}) {
  const [conversations, setConversations] = useState<ConversationOption[] | null>(null);
  const [sendingTo, setSendingTo] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  useEffect(() => {
    listMyConversations().then((data) =>
      setConversations((data as ConversationOption[]).filter((c) => c.id !== currentCoupleId))
    );
  }, [currentCoupleId]);

  async function handleForward(targetId: string) {
    setSendingTo(targetId);
    const res = await forwardMessage(targetId, messageId);
    setSendingTo(null);
    if (!res?.error) setSentTo(targetId);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/35" onClick={onClose} aria-hidden />
      <div className="safe-bottom animate-sheet-up relative w-full max-w-md rounded-t-3xl bg-[var(--surface)] p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-[var(--foreground)]">Chuyển tiếp tới</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-black/5 text-[var(--muted)]"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>

        {conversations === null && (
          <p className="py-6 text-center text-sm text-[var(--muted)]">Đang tải danh sách...</p>
        )}

        {conversations?.length === 0 && (
          <p className="py-6 text-center text-sm text-[var(--muted)]">
            Bạn chưa có cuộc trò chuyện nào khác để chuyển tiếp tới.
          </p>
        )}

        <div className="space-y-1.5">
          {conversations?.map((c) => (
            <button
              key={c.id}
              type="button"
              disabled={sendingTo === c.id}
              onClick={() => handleForward(c.id)}
              className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left active:bg-black/5 disabled:opacity-60"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--brand-light)] text-[var(--brand-dark)]">
                <ForwardMsgIcon className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1 truncate font-medium text-[var(--foreground)]">{c.pet_name}</span>
              {sentTo === c.id ? (
                <span className="text-xs font-semibold text-green-600">Đã gửi ✓</span>
              ) : sendingTo === c.id ? (
                <span className="text-xs text-[var(--muted)]">Đang gửi...</span>
              ) : null}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
