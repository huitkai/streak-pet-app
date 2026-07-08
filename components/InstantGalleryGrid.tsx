"use client";

/**
 * Màn hình DANH SÁCH Ảnh đã chụp từ <InstantCaptureMulti> — hiển thị dạng
 * lưới 4 ảnh/dòng, mỗi ảnh vẫn giữ nguyên khung tem răng cưa đã bake sẵn lúc
 * chụp (không cần vẽ lại gì thêm, chỉ hiện đúng file PNG đã có).
 *
 * Bấm vào 1 ảnh MỞ MÀN XEM FULL-SCREEN (<InstantPhotoViewer>) thay vì chỉ
 * tick chọn như trước — từ màn xem đó mới có nút "Chia sẻ" để mở bảng chọn
 * người nhận, và menu "..." để xoá từng ảnh/lưu vào thư viện.
 *
 * Nút X góc trên trái CHỈ ĐÓNG màn hình — KHÔNG xoá ảnh nháp đã lưu (trước
 * đây gán nhầm là "Huỷ toàn bộ" khiến bấm X tưởng chỉ để thoát ra lại xoá
 * sạch hết ảnh, đúng lỗi người dùng báo "thoát ra vào lại là mất ảnh"). Muốn
 * xoá ảnh nào thì vào xem chi tiết rồi xoá từng tấm qua menu "...".
 *
 * Nền của mỗi ô cố tình tối (bg-black/90) thay vì trắng — vì viền tem PNG
 * màu trắng ngà (#fffdf8) sẽ hoà lẫn vào nền sáng, khó thấy hình dạng răng
 * cưa; nền tối giúp khung tem nổi bật rõ ràng, đúng cảm giác đang xem 1 xấp
 * ảnh polaroid thật để trên bàn tối.
 */

import { useState } from "react";
import { XIcon, CameraFlipIcon } from "@/components/icons";
import InstantPhotoViewer from "@/components/InstantPhotoViewer";
import type { CapturedShot } from "@/components/InstantCaptureMulti";
import type { ConversationSummary } from "@/lib/types";

export default function InstantGalleryGrid({
  shots,
  conversations,
  defaultRecipientId,
  onBackToCamera,
  onRemove,
  onShare,
  onClose,
  sending,
}: {
  shots: CapturedShot[];
  /** Danh sách hội thoại có thể chia sẻ tới — hiện thường chỉ có 1 (couple). */
  conversations: ConversationSummary[];
  defaultRecipientId?: string | null;
  onBackToCamera: () => void;
  onRemove: (id: string) => void;
  onShare: (shot: CapturedShot, recipientIds: string[]) => Promise<void> | void;
  /** Chỉ đóng màn hình — ảnh nháp chưa gửi vẫn được giữ nguyên trong
   * IndexedDB để lần sau mở lại vẫn còn. */
  onClose: () => void;
  sending: boolean;
}) {
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

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
        {shots.length === 0 ? (
          <p className="mt-10 text-center text-sm text-white/50">Chưa có ảnh nào — bấm chụp thêm để bắt đầu.</p>
        ) : (
          <div className="grid grid-cols-3 gap-4 p-2">
            {shots.map((shot, i) => (
              <div
                key={shot.id}
                className="relative"
                style={{
                  aspectRatio: `${shot.width} / ${shot.height}`,
                  // Xoay nhẹ xen kẽ theo chỉ số — gợi cảm giác 1 xấp tem thật
                  // được rải ra bàn, giống cách các con tem trong ảnh tham
                  // khảo không nằm thẳng hàng cứng nhắc.
                  transform: `rotate(${(i % 5) - 2}deg)`,
                }}
              >
                <button
                  type="button"
                  onClick={() => setViewerIndex(i)}
                  aria-label="Xem ảnh"
                  className="absolute inset-0 active:scale-95 transition"
                >
                  {/* Không dùng overflow-hidden/rounded-lg ở đây nữa — PNG đã
                      tự có hình dạng răng cưa + góc bo mềm được bake sẵn, bọc
                      thêm khung bo góc vuông sẽ đè lên và cắt cụt răng cưa ở
                      góc. Thêm drop-shadow để con tem "nổi" khỏi nền tối,
                      đúng tinh thần ảnh tem tham khảo thay vì dính bẹt. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={shot.url}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover drop-shadow-[0_3px_8px_rgba(0,0,0,0.55)]"
                  />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {viewerIndex !== null && (
        <InstantPhotoViewer
          shots={shots}
          initialIndex={viewerIndex}
          conversations={conversations}
          defaultRecipientId={defaultRecipientId}
          sending={sending}
          onClose={() => setViewerIndex(null)}
          onRemove={(id) => {
            onRemove(id);
          }}
          onShare={onShare}
        />
      )}
    </div>
  );
}
