"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import Avatar from "@/components/Avatar";
import FlameBadge from "@/components/FlameBadge";
import { PinIcon, BellOffIcon } from "@/components/icons";
import TimeText from "@/components/TimeText";
import { usePartnerOnline } from "@/lib/presence";
import { setConversationFlag } from "@/lib/actions";
import type { ConversationSummary } from "@/lib/types";

// Vuốt trái lộ 2 nút hành động (Ghim, Tắt thông báo) — mỗi nút rộng 72px.
const ACTION_WIDTH = 72;
const ACTIONS_TOTAL = ACTION_WIDTH * 2;
// Vuốt quá nửa bề rộng vùng hành động thì tự "chốt" mở luôn, thay vì phải
// kéo hết mới nhả tay, giống hành vi swipe-to-reveal ở Messenger/Gmail.
const OPEN_THRESHOLD = ACTIONS_TOTAL / 2;

export default function ConversationRow({
  conversation,
  myUserId,
}: {
  conversation: ConversationSummary;
  myUserId: string;
}) {
  const isOnline = usePartnerOnline(conversation.id, myUserId, conversation.partnerId);
  const hasUnread = conversation.unreadCount > 0;
  const router = useRouter();
  const [, startTransition] = useTransition();

  // Optimistic: đổi UI ngay khi bấm, rollback nếu server action lỗi.
  const [isPinned, setIsPinned] = useState(conversation.isPinned);
  const [isMuted, setIsMuted] = useState(conversation.isMuted);

  const x = useMotionValue(0);
  const actionsOpacity = useTransform(x, [-ACTIONS_TOTAL, 0], [1, 0]);

  function closeActions() {
    animate(x, 0, { type: "spring", stiffness: 500, damping: 40 });
  }

  function runFlag(flag: "pinned" | "muted", nextValue: boolean, revert: () => void) {
    closeActions();
    startTransition(async () => {
      const res = await setConversationFlag(conversation.id, flag, nextValue);
      if (res?.error) revert();
    });
  }

  function handlePin() {
    const next = !isPinned;
    setIsPinned(next);
    runFlag("pinned", next, () => setIsPinned(!next));
  }

  function handleMute() {
    const next = !isMuted;
    setIsMuted(next);
    runFlag("muted", next, () => setIsMuted(!next));
  }

  return (
    <div className="relative overflow-hidden">
      {/* Lớp nền chứa 2 nút hành động, luôn nằm dưới, chỉ lộ ra khi vuốt trái */}
      <motion.div className="absolute inset-y-0 right-0 flex" style={{ opacity: actionsOpacity }}>
        <button
          type="button"
          onClick={handleMute}
          style={{ width: ACTION_WIDTH }}
          className="flex h-full flex-col items-center justify-center gap-1 bg-amber-500 text-white active:brightness-95"
        >
          <BellOffIcon className="h-5 w-5" filled={isMuted} />
          <span className="text-[10px] font-semibold">{isMuted ? "Đã tắt" : "Tắt tin"}</span>
        </button>
        <button
          type="button"
          onClick={handlePin}
          style={{ width: ACTION_WIDTH }}
          className="gradient-brand flex h-full flex-col items-center justify-center gap-1 text-white active:brightness-95"
        >
          <PinIcon className="h-5 w-5" filled={isPinned} />
          <span className="text-[10px] font-semibold">{isPinned ? "Đã ghim" : "Ghim"}</span>
        </button>
      </motion.div>

      <motion.div
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: -ACTIONS_TOTAL, right: 0 }}
        dragElastic={0.05}
        style={{ x }}
        onDragEnd={(_, info) => {
          const shouldOpen = x.get() < -OPEN_THRESHOLD || info.velocity.x < -400;
          animate(x, shouldOpen ? -ACTIONS_TOTAL : 0, { type: "spring", stiffness: 500, damping: 40 });
        }}
        className="relative bg-[var(--surface)]"
      >
        <a
          href="/chat"
          onClick={(e) => {
            // Nếu hành động đang mở sẵn (đã vuốt trước đó), 1 tap nữa để đóng
            // lại thay vì điều hướng luôn — đúng hành vi swipe-list quen thuộc.
            e.preventDefault();
            if (x.get() < -4) {
              closeActions();
              return;
            }
            router.push("/chat");
          }}
          className="flex items-center gap-3 px-4 py-3 transition active:bg-black/[0.04]"
        >
          <span
            className={`relative shrink-0 rounded-full p-[2px] ${
              conversation.hasUnseenInstant
                ? "gradient-brand"
                : conversation.hasInstant
                  ? "bg-black/15"
                  : ""
            }`}
          >
            <Avatar
              url={conversation.partnerProfile?.avatar_url}
              name={conversation.nickname || conversation.petName}
              size={48}
            />
            {isOnline && (
              <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[var(--surface)] bg-emerald-400" />
            )}
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <span className="flex min-w-0 items-center gap-1">
                {isPinned && <PinIcon className="h-3 w-3 shrink-0 text-[var(--muted)]" filled />}
                <span
                  className={`truncate ${
                    hasUnread ? "font-bold text-[var(--foreground)]" : "font-semibold text-[var(--foreground)]"
                  }`}
                >
                  {conversation.nickname}
                </span>
                {isMuted && <BellOffIcon className="h-3 w-3 shrink-0 text-[var(--muted)]" />}
              </span>
              <div className="flex shrink-0 items-center gap-1.5">
                {conversation.lastMessageAt && (
                  <span className="text-[11px] text-[var(--muted)]">
                    <TimeText iso={conversation.lastMessageAt} />
                  </span>
                )}
                <FlameBadge streak={conversation.currentStreak} size="sm" />
              </div>
            </div>
            <div className="mt-0.5 flex items-center justify-between gap-2">
              <p
                className={`truncate text-[13px] ${
                  hasUnread ? "font-medium text-[var(--foreground)]" : "text-[var(--muted)]"
                }`}
              >
                {conversation.previewText}
              </p>
              {hasUnread && !isMuted && (
                <span className="gradient-brand flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 text-[10px] font-bold text-white shadow-float">
                  {conversation.unreadCount > 99 ? "99+" : conversation.unreadCount}
                </span>
              )}
            </div>
          </div>
        </a>
      </motion.div>
    </div>
  );
}
