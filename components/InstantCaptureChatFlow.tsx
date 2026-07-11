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
 * (InstantCaptureMulti) + màn hình lưới (InstantChatGalleryGrid) đã có sẵn
 * cho luồng "Chụp ảnh tức thì" ngoài màn hình chính, chỉ khác ở bước GỬI:
 * thay vì tự upload rồi điều hướng sang /chat, component này giao việc gửi
 * lại cho ChatBox qua prop `onSend` — để ChatBox hiện bong bóng ảnh ngay lập
 * tức bằng blob cục bộ trong danh sách tin nhắn hiện có (không đổi trang),
 * đúng pattern `handleStampCapture` đã dùng cho ảnh đơn trước đây.
 *
 * QUAN TRỌNG — bản sửa lỗi "chụp xong thoát ra là mất, không xem lại được":
 * y hệt cách InstantSessionFlow đã làm, `shots` được đồng bộ 2 chiều với
 * IndexedDB (xem lib/instant-shots-store.ts, source="chat" để không lẫn với
 * ảnh nháp của luồng "Chụp ảnh tức thì" ngoài danh sách hội thoại): chụp
 * xong lưu ngay, xoá thì xoá luôn bản lưu, gửi xong thì chỉ xoá bản lưu của
 * đúng ảnh đã chọn gửi — ảnh chưa chọn vẫn còn nguyên cho lần mở camera sau.
 */

import { useEffect, useState } from "react";
import InstantCaptureMulti, { type CapturedShot } from "@/components/InstantCaptureMulti";
import InstantGalleryGrid from "@/components/InstantChatGalleryGrid";
import { listDraftShots, saveDraftShot, deleteDraftShot, deleteDraftShots } from "@/lib/instant-shots-store";

type Step = "camera" | "gallery";

export default function InstantCaptureChatFlow({
  userId,
  onSend,
  onClose,
  sending,
}: {
  /** Lọc đúng ảnh nháp của người đang đăng nhập — xem ghi chú field userId
   * trong lib/instant-shots-store.ts. */
  userId: string;
  /** ChatBox tự lo việc hiện bong bóng tạm + upload + gọi sendStampPhoto cho
   * từng ảnh đã chọn — xem handleStampCaptureMulti trong ChatBox.tsx. */
  onSend: (shots: CapturedShot[]) => void | Promise<void>;
  onClose: () => void;
  sending: boolean;
}) {
  const [step, setStep] = useState<Step>("camera");
  const [shots, setShots] = useState<CapturedShot[]>([]);

  // Nạp lại ảnh nháp đã lưu từ lần chụp trước (kể cả phiên đã đóng từ lâu)
  // ngay khi mở camera lên — xem giải thích ở comment đầu file.
  useEffect(() => {
    let cancelled = false;
    listDraftShots(userId, "chat").then((stored) => {
      if (cancelled) return;
      setShots((prev) =>
        prev.length > 0
          ? prev
          : stored.map((s) => ({ id: s.id, url: URL.createObjectURL(s.blob), blob: s.blob, width: s.width, height: s.height }))
      );
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  function handleShot(shot: CapturedShot) {
    setShots((prev) => [...prev, shot]);
    saveDraftShot({
      id: shot.id,
      blob: shot.blob,
      width: shot.width,
      height: shot.height,
      createdAt: Date.now(),
      source: "chat",
      userId,
    }).catch((e) => console.error("Lưu ảnh nháp thất bại", e));
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
    deleteDraftShot(id).catch((e) => console.error("Xoá ảnh nháp thất bại", e));
  }

  // Đóng màn hình lưới — CHỈ dọn blob URL tạm, KHÔNG xoá ảnh nháp đã lưu
  // trong IndexedDB (trước đây gán nhầm là "Huỷ toàn bộ" nên bấm X tưởng chỉ
  // để thoát ra lại làm mất hết ảnh).
  function handleGalleryClose() {
    shots.forEach((s) => URL.revokeObjectURL(s.url));
    onClose();
  }

  async function handleSend(selected: CapturedShot[]) {
    if (selected.length === 0) return;
    // Không revoke object URL ở đây — ChatBox đang dùng chính các URL này
    // làm ảnh hiển thị tạm cho bong bóng "đang gửi" trong khung chat.
    await onSend(selected);
    // Chỉ xoá bản nháp của ĐÚNG các ảnh đã chọn gửi — ảnh nào không chọn lần
    // này vẫn giữ nguyên làm nháp cho lần chụp sau.
    await deleteDraftShots(selected.map((s) => s.id)).catch((e) =>
      console.error("Xoá ảnh nháp đã gửi thất bại", e)
    );
    onClose();
  }

  if (step === "gallery") {
    return (
      <InstantGalleryGrid
        shots={shots}
        onBackToCamera={() => setStep("camera")}
        onRemove={handleRemove}
        onSend={handleSend}
        onClose={handleGalleryClose}
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
