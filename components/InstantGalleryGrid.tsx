"use client";

/**
 * Màn hình DANH SÁCH Ảnh đã chụp từ <InstantCaptureMulti> — hiển thị dạng
 * lưới 4 ảnh/dòng, mỗi ảnh vẫn giữ nguyên khung tem răng cưa đã bake sẵn lúc
 * chụp (không cần vẽ lại gì thêm, chỉ hiện đúng file PNG đã có).
 *
 * Nền của mỗi ô cố tình tối (bg-black/90) thay vì trắng — vì viền tem PNG
 * màu trắng ngà (#fffdf8) sẽ hoà lẫn vào nền sáng, khó thấy hình dạng răng
 * cưa; nền tối giúp khung tem nổi bật rõ ràng, đúng cảm giác đang xem 1 xấp
 * ảnh polaroid thật để trên bàn tối.
 */

import { useState } from "react";
import { XIcon, TrashIcon, SendIcon, CheckIcon, CameraFlipIcon } from "@/components/icons";
import type { CapturedShot } from "@/components/InstantCaptureMulti";

export default function InstantGalleryGrid({
  shots,
  onBackToCamera,
  onRemove,
  onSend,
  onDiscardAll,
  sending,
}: {
  shots: CapturedShot[];
  onBackToCamera: () => void;
  onRemove: (id: string) => void;
  onSend: (selected: CapturedShot[]) => void;
  onDiscardAll: () => void;
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
          onClick={onDiscardAll}
          aria-label="Huỷ toàn bộ"
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
        <div className="grid grid-cols-4 gap-2">
          {shots.map((shot) => {
            const isSelected = selected.has(shot.id);
            return (
              <div key={shot.id} className="relative aspect-[4/5] overflow-hidden rounded-lg bg-black/90">
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
