"use client";

/**
 * Lưới ảnh dùng RIÊNG cho luồng "Chụp nhanh trong khung chat"
 * (InstantCaptureChatFlow) — KHÁC với InstantGalleryGrid dùng cho "Chụp ảnh
 * tức thì" ngoài danh sách hội thoại.
 *
 * Lý do tách riêng thay vì dùng chung InstantGalleryGrid: ở đây luôn gửi vào
 * ĐÚNG cuộc trò chuyện đang mở (ChatBox đã biết sẵn coupleId), không cần mở
 * bảng chọn người nhận — nên vẫn giữ UX cũ: tick chọn nhiều ảnh rồi bấm Gửi
 * 1 lần, thay vì bấm từng ảnh để xem rồi chia sẻ như InstantGalleryGrid bản
 * mới.
 */

import { useState } from "react";
import { XIcon, TrashIcon, SendIcon, CheckIcon, CameraFlipIcon } from "@/components/icons";
import type { CapturedShot } from "@/components/InstantCaptureMulti";

export default function InstantChatGalleryGrid({
  shots,
  onBackToCamera,
  onRemove,
  onSend,
  onClose,
  sending,
}: {
  shots: CapturedShot[];
  onBackToCamera: () => void;
  onRemove: (id: string) => void;
  onSend: (selected: CapturedShot[]) => void;
  /** Chỉ đóng màn hình — ảnh nháp chưa gửi vẫn được giữ nguyên. */
  onClose: () => void;
  sending: boolean;
}) {
  // Mặc định chọn TẤT CẢ ảnh vừa chụp — người dùng bỏ chọn tấm nào không ưng
  // thay vì phải tự chọn từng tấm, vì đa số trường hợp sẽ muốn gửi hết.
  const [selected, setSelected] = useState<Set<string>>(() => new Set(shots.map((s) => s.id)));

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const selectedShots = shots.filter((s) => selected.has(s.id));

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <div className="safe-top flex items-center justify-between px-4 py-3">
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white active:scale-90"
        >
          <XIcon className="h-5 w-5" />
        </button>
        <p className="text-sm font-semibold text-white">{shots.length} ảnh đã chụp</p>
        <button
          type="button"
          onClick={onBackToCamera}
          aria-label="Chụp thêm"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white active:scale-90"
        >
          <CameraFlipIcon className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-2">
        <div className="grid grid-cols-3 gap-2">
          {shots.map((shot) => {
            const isSelected = selected.has(shot.id);
            return (
              <div
                key={shot.id}
                className="relative overflow-hidden rounded-lg bg-black/90"
                style={{ aspectRatio: `${shot.width} / ${shot.height}` }}
              >
                <button
                  type="button"
                  onClick={() => toggle(shot.id)}
                  aria-label={isSelected ? "Bỏ chọn ảnh" : "Chọn ảnh"}
                  className="absolute inset-0"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={shot.url}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className={`h-full w-full object-cover transition ${isSelected ? "" : "opacity-40"}`}
                  />
                </button>

                <div
                  className={`pointer-events-none absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                    isSelected ? "border-[var(--brand)] bg-[var(--brand)]" : "border-white/80 bg-black/30"
                  }`}
                >
                  {isSelected && <CheckIcon className="h-3 w-3 text-white" strokeWidth={3} />}
                </div>

                <button
                  type="button"
                  onClick={() => onRemove(shot.id)}
                  aria-label="Xoá ảnh này"
                  className="absolute left-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/50 text-white active:scale-90"
                >
                  <TrashIcon className="h-3 w-3" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="safe-bottom flex items-center justify-between gap-3 border-t border-white/10 px-4 py-3">
        <p className="text-xs text-white/60">
          {selectedShots.length > 0 ? `Đã chọn ${selectedShots.length} ảnh` : "Chưa chọn ảnh nào"}
        </p>
        <button
          type="button"
          onClick={() => onSend(selectedShots)}
          disabled={selectedShots.length === 0 || sending}
          className="flex items-center gap-1.5 rounded-full bg-[var(--brand)] px-5 py-2.5 text-sm font-semibold text-white active:scale-95 disabled:opacity-40"
        >
          {sending ? "Đang gửi..." : "Gửi"}
          <SendIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
