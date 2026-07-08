"use client";

/**
 * Điều phối luồng "Chụp nhanh" NGAY TRONG khung chat (mở từ nút camera trong
 * ô đính kèm của ChatBox) — bản sửa lại theo đúng hành vi Instagram:
 *
 *   camera (chụp nhiều tấm liên tiếp, mỗi tấm rơi vào danh sách)
 *     -> gallery (xem lưới 4 ảnh/dòng — bấm vào nút số ảnh ở khung camera)
 *     -> chọn ảnh muốn gửi rồi bấm "Gửi"
 *
 * TRƯỚC ĐÂY: bấm chụp là gửi thẳng luôn (xem components/InstantCapture.tsx),
 * ảnh không hề được giữ lại ở đâu để xem lại hay chọn lọc — đây chính là lỗi
 * người dùng báo ("lưu dạng tạm thời", "không thể xem lại", "không chọn được
 * sẽ gửi ảnh nào"). Bản này TÁI SỬ DỤNG nguyên khung camera nhiều tấm
 * (InstantCaptureMulti) + màn hình lưới (InstantGalleryGrid) đã có sẵn cho
 * luồng "Chụp ảnh tức thì" ngoài màn hình chính, chỉ khác ở bước GỬI: thay vì
 * tự upload rồi điều hướng sang /chat, component này giao việc gửi lại cho
 * ChatBox qua prop `onSend` — để ChatBox hiện bong bóng ảnh ngay lập tức
 * bằng blob cục bộ trong danh sách tin nhắn hiện có (không đổi trang), đúng
 * pattern `handleStampCapture` đã dùng cho ảnh đơn trước đây.
 */

import { useState } from "react";
import InstantCaptureMulti, { type CapturedShot } from "@/components/InstantCaptureMulti";
import InstantGalleryGrid from "@/components/InstantGalleryGrid";

type Step = "camera" | "gallery";

export default function InstantCaptureChatFlow({
  onSend,
  onClose,
  sending,
}: {
  /** ChatBox tự lo việc hiện bong bóng tạm + upload + gọi sendStampPhoto cho
   * từng ảnh đã chọn — xem handleStampCaptureMulti trong ChatBox.tsx. */
  onSend: (shots: CapturedShot[]) => void | Promise<void>;
  onClose: () => void;
  sending: boolean;
}) {
  const [step, setStep] = useState<Step>("camera");
  const [shots, setShots] = useState<CapturedShot[]>([]);

  function handleShot(shot: CapturedShot) {
    setShots((prev) => [...prev, shot]);
  }

  function handleRemove(id: string) {
    setShots((prev) => {
      const target = prev.find((s) => s.id === id);
      if (target) URL.revokeObjectURL(target.url);
      const next = prev.filter((s) => s.id !== id);
      // Hết ảnh thì quay lại camera luôn, đứng giữa màn hình lưới trống
      // không có tác dụng gì.
      if (next.length === 0) setStep("camera");
      return next;
    });
  }

  function handleDiscardAll() {
    shots.forEach((s) => URL.revokeObjectURL(s.url));
    onClose();
  }

  async function handleSend(selected: CapturedShot[]) {
    if (selected.length === 0) return;
    // Không revoke object URL ở đây — ChatBox đang dùng chính các URL này
    // làm ảnh hiển thị tạm cho bong bóng "đang gửi" trong khung chat.
    await onSend(selected);
    onClose();
  }

  if (step === "gallery") {
    return (
      <InstantGalleryGrid
        shots={shots}
        onBackToCamera={() => setStep("camera")}
        onRemove={handleRemove}
        onSend={handleSend}
        onDiscardAll={handleDiscardAll}
        sending={sending}
      />
    );
  }

  return (
    <InstantCaptureMulti
      shots={shots}
      onShot={handleShot}
      onOpenGallery={() => setStep("gallery")}
      onClose={() => {
        if (shots.length > 0) {
          setStep("gallery");
        } else {
          onClose();
        }
      }}
    />
  );
}
