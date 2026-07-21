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
import { SHOW_COUPLE_FEATURES } from "@/lib/feature-flags";
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
    <div className="relative mb-2 overflow-hidden rounded-3xl">
      {/* Lớp nền chứa 2 nút hành động, luôn nằm dưới, chỉ lộ ra khi vuốt trái */}
      <motion.div className="absolute inset-y-0 right-0 flex" style={{ opacity: actionsOpacity }}>
        <button
          type="button"
          onClick={handleMute}
          style={{ width: ACTION_WIDTH }}
          className="flex h-full flex-col items-center justify-center gap-1 bg-amber-600 text-white active:brightness-95"
        >
          <BellOffIcon className="h-5 w-5" filled={isMuted} />
          <span className="text-[10px] font-semibold">{isMuted ? "Đã tắt" : "Tắt tin"}</span>
        </button>
        <button
          type="button"
          onClick={handlePin}
          style={{ width: ACTION_WIDTH }}
          className="flex h-full flex-col items-center justify-center gap-1 bg-[var(--brand)] text-white active:brightness-95"
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
        className="glass-surface relative rounded-3xl"
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
          className="flex items-center gap-3 rounded-3xl px-3.5 py-3 transition active:bg-white/5"
        >
          <span
            className={`relative shrink-0 rounded-full p-[2.5px] ${isOnline ? "avatar-ring-online" : "avatar-ring-offline"}`}
          >
            {/* cover-photo-frame: kỹ thuật ảnh nền tự-blur + scrim tối, xem
                comment chi tiết trong globals.css. Ở avatar tròn, blur layer
                chủ yếu tạo glow màu bao quanh viền khi avatar không full-bleed. */}
            <span className="cover-photo-frame block rounded-full border-2 border-[var(--background)]">
              {conversation.partnerProfile?.avatar_url && (
                <span
                  className="cover-photo-blur"
                  style={{ backgroundImage: `url(${conversation.partnerProfile.avatar_url})` }}
                />
              )}
              <span className="cover-photo-content">
                <Avatar
                  url={conversation.partnerProfile?.avatar_url}
                  name={conversation.nickname || conversation.petName}
                  size={54}
                />
              </span>
            </span>
            {isOnline && (
              <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-[var(--background)] bg-emerald-400" />
            )}
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <span className="flex min-w-0 items-center gap-1">
                {isPinned && <PinIcon className="h-3 w-3 shrink-0 text-[var(--muted)]" filled />}
                <span
                  className={`truncate text-[15px] ${
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
              <div className="flex shrink-0 items-center gap-1.5">
                {SHOW_COUPLE_FEATURES && <FlameBadge streak={conversation.currentStreak} size="sm" />}
                {hasUnread && !isMuted && (
                  <span className="unread-dot flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 text-[10px] font-bold text-white">
                    {conversation.unreadCount > 99 ? "99+" : conversation.unreadCount}
                  </span>
                )}
              </div>
            </div>
          </div>
        </a>
      </motion.div>
    </div>
  );
}
