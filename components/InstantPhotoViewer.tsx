"use client";

/**
 * Màn XEM 1 ảnh tức thì full-screen, mở ra khi bấm vào 1 ô trong
 * <InstantGalleryGrid>. Vuốt/bấm mũi tên trái-phải để chuyển ảnh trong cùng
 * danh sách mà không cần đóng màn ra rồi mở lại. Có 2 hành động: xoá ảnh này
 * khỏi danh sách nháp, hoặc chia sẻ (mở <RecipientPickerSheet> chọn người
 * nhận rồi gửi).
 */

import { useState } from "react";
import { XIcon, TrashIcon, ForwardMsgIcon, ChevronRightIcon, MoreIcon, ImageIcon } from "@/components/icons";
import RecipientPickerSheet from "@/components/RecipientPickerSheet";
import type { CapturedShot } from "@/components/InstantCaptureMulti";
import type { ConversationSummary } from "@/lib/types";

export default function InstantPhotoViewer({
  shots,
  initialIndex,
  conversations,
  defaultRecipientId,
  sending,
  onClose,
  onRemove,
  onShare,
}: {
  shots: CapturedShot[];
  initialIndex: number;
  conversations: ConversationSummary[];
  defaultRecipientId?: string | null;
  sending: boolean;
  onClose: () => void;
  onRemove: (id: string) => void;
  onShare: (shot: CapturedShot, recipientIds: string[]) => Promise<void> | void;
}) {
  const [index, setIndex] = useState(initialIndex);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Ảnh ở vị trí hiện tại có thể đã bị xoá (mảng shots thay đổi từ ngoài) —
  // kẹp lại index trong khoảng hợp lệ và tự đóng nếu không còn ảnh nào.
  const clamped = Math.min(index, shots.length - 1);
  const shot = shots[clamped];

  if (!shot) {
    onClose();
    return null;
  }

  function goPrev() {
    setIndex((i) => Math.max(0, i - 1));
  }
  function goNext() {
    setIndex((i) => Math.min(shots.length - 1, i + 1));
  }

  async function handleConfirmShare(recipientIds: string[]) {
    await onShare(shot, recipientIds);
    setPickerOpen(false);
  }

  // Tải ảnh về máy — dùng thẻ <a download> chuẩn web, trình duyệt/hệ điều
  // hành sẽ tự lưu vào thư viện ảnh hoặc thư mục Downloads tuỳ nền tảng.
  function handleSaveToLibrary() {
    const a = document.createElement("a");
    a.href = shot.url;
    a.download = `streak-pet-${shot.id}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setMenuOpen(false);
  }

  function handleDelete() {
    setMenuOpen(false);
    onRemove(shot.id);
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-black">
      <div className="safe-top flex items-center justify-between px-4 py-3">
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white active:scale-90"
        >
          <XIcon className="h-5 w-5" />
        </button>
        <p className="text-sm font-medium text-white/80">
          {clamped + 1} / {shots.length}
        </p>
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Thêm tuỳ chọn"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white active:scale-90"
          >
            <MoreIcon className="h-5 w-5" />
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} aria-hidden />
              <div className="absolute right-0 top-11 z-20 w-56 overflow-hidden rounded-2xl bg-[var(--surface)] py-1 shadow-xl">
                <button
                  type="button"
                  onClick={handleSaveToLibrary}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium text-[var(--foreground)] transition active:bg-black/5"
                >
                  <ImageIcon className="h-4 w-4" />
                  Lưu ảnh vào thư viện
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium text-red-500 transition active:bg-black/5"
                >
                  <TrashIcon className="h-4 w-4" />
                  Xoá ảnh tức thì
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="relative flex flex-1 items-center justify-center overflow-hidden px-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={shot.url} alt="" className="max-h-full max-w-full object-contain" />

        {clamped > 0 && (
          <button
            type="button"
            onClick={goPrev}
            aria-label="Ảnh trước"
            className="absolute left-1 flex h-10 w-10 items-center justify-center rounded-full bg-black/30 text-white active:scale-90"
          >
            <ChevronRightIcon className="h-5 w-5 rotate-180" />
          </button>
        )}
        {clamped < shots.length - 1 && (
          <button
            type="button"
            onClick={goNext}
            aria-label="Ảnh sau"
            className="absolute right-1 flex h-10 w-10 items-center justify-center rounded-full bg-black/30 text-white active:scale-90"
          >
            <ChevronRightIcon className="h-5 w-5" />
          </button>
        )}
      </div>

      <div className="safe-bottom flex items-center justify-center px-4 py-4">
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="flex items-center gap-2 rounded-full bg-[var(--brand)] px-6 py-3 text-sm font-semibold text-white active:scale-95"
        >
          <ForwardMsgIcon className="h-4 w-4" />
          Chia sẻ
        </button>
      </div>

      {pickerOpen && (
        <RecipientPickerSheet
          conversations={conversations}
          defaultSelectedId={defaultRecipientId}
          sending={sending}
          onClose={() => setPickerOpen(false)}
          onConfirm={handleConfirmShare}
        />
      )}
    </div>
  );
}
