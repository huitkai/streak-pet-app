"use client";

import type { ReactNode } from "react";
import {
  ReplyIcon,
  ForwardMsgIcon,
  PinIcon,
  EditIcon,
  TrashIcon,
  UndoIcon,
  CopyIcon,
} from "@/components/icons";

interface MessageDockAction {
  key: string;
  label: string;
  icon: ReactNode;
  onClick: () => void;
  danger?: boolean;
}

/**
 * Dock hành động cho 1 tin nhắn — CHỦ ĐÍCH không làm giống menu popup căn
 * giữa kiểu iOS/Messenger: đây là 1 dải icon nằm ngang, neo ở ĐÁY khung
 * chat (ngay trên ô nhập), trượt lên từ dưới — luôn nằm trong tầm ngón cái
 * trên điện thoại, không che mất phần tin nhắn phía trên.
 */
export default function MessageActionDock({
  canEdit,
  canRecall,
  isPinned,
  isText,
  onReply,
  onForward,
  onCopy,
  onTogglePin,
  onEdit,
  onRecall,
  onHide,
  onClose,
}: {
  canEdit: boolean;
  canRecall: boolean;
  isPinned: boolean;
  isText: boolean;
  onReply: () => void;
  onForward: () => void;
  onCopy?: () => void;
  onTogglePin: () => void;
  onEdit?: () => void;
  onRecall?: () => void;
  onHide: () => void;
  onClose: () => void;
}) {
  const actions: MessageDockAction[] = [
    { key: "reply", label: "Trả lời", icon: <ReplyIcon className="h-5 w-5" />, onClick: onReply },
    { key: "forward", label: "Chuyển tiếp", icon: <ForwardMsgIcon className="h-5 w-5" />, onClick: onForward },
    {
      key: "pin",
      label: isPinned ? "Bỏ ghim" : "Ghim",
      icon: <PinIcon className="h-5 w-5" filled={isPinned} />,
      onClick: onTogglePin,
    },
  ];
  if (isText && onCopy) {
    actions.push({ key: "copy", label: "Sao chép", icon: <CopyIcon className="h-5 w-5" />, onClick: onCopy });
  }
  if (canEdit && onEdit) {
    actions.push({ key: "edit", label: "Sửa", icon: <EditIcon className="h-5 w-5" />, onClick: onEdit });
  }
  if (canRecall && onRecall) {
    actions.push({
      key: "recall",
      label: "Thu hồi",
      icon: <UndoIcon className="h-5 w-5" />,
      onClick: onRecall,
      danger: true,
    });
  }
  actions.push({ key: "hide", label: "Xoá ở tôi", icon: <TrashIcon className="h-5 w-5" />, onClick: onHide, danger: true });

  return (
    <>
      <button type="button" aria-label="Đóng" onClick={onClose} className="fixed inset-0 z-30 cursor-default bg-black/10" />
      <div className="animate-dock-up fixed inset-x-0 bottom-0 z-40 rounded-t-[28px] bg-[var(--surface)] pb-[calc(env(safe-area-inset-bottom)+10px)] pt-2.5 shadow-[0_-8px_30px_rgba(0,0,0,0.12)]">
        <div className="mx-auto mb-2 h-1 w-9 rounded-full bg-black/10" />
        <div className="thin-scroll flex gap-1.5 overflow-x-auto px-3 pb-1">
          {actions.map((a) => (
            <button
              key={a.key}
              type="button"
              onClick={() => {
                a.onClick();
                onClose();
              }}
              className={`flex min-w-[68px] shrink-0 flex-col items-center gap-1.5 rounded-2xl px-3 py-2.5 active:scale-95 ${
                a.danger ? "text-red-500" : "text-[var(--foreground)]"
              }`}
            >
              <span
                className={`flex h-11 w-11 items-center justify-center rounded-full ${
                  a.danger ? "bg-red-50" : "bg-[var(--brand-light)] text-[var(--brand-dark)]"
                }`}
              >
                {a.icon}
              </span>
              <span className="text-[11px] font-medium leading-none">{a.label}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
