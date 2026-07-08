"use client";

/**
 * Điều phối luồng "Chụp ảnh tức thì" NGOÀI màn hình chính (mở từ nút camera
 * trong ConversationListClient, tách biệt hoàn toàn khỏi Chụp nhanh trong
 * khung chat — xem components/InstantCapture.tsx):
 *
 *   camera (chụp nhiều tấm liên tiếp, mỗi tấm rơi vào danh sách)
 *     -> gallery (xem lưới 4 ảnh/dòng, bỏ chọn/xoá ảnh không ưng)
 *     -> gửi các ảnh đã chọn vào cuộc trò chuyện, rồi điều hướng sang /chat
 *
 * Việc upload lên Storage + gọi sendStampPhoto tái dùng ĐÚNG cách mã hoá nội
 * dung (encodeStampPhoto qua sendStampPhoto) mà ChatBox.handleStampCapture
 * đang dùng cho Chụp nhanh trong chat, để 2 nơi hiển thị bong bóng ảnh giống
 * hệt nhau (không viền/không bo góc, giữ nguyên hình dạng PNG đã đục lỗ).
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import InstantCaptureMulti, { type CapturedShot } from "@/components/InstantCaptureMulti";
import InstantGalleryGrid from "@/components/InstantGalleryGrid";
import { createClient } from "@/lib/supabase/client";
import { sendStampPhoto } from "@/lib/actions";

type Step = "camera" | "gallery";

export default function InstantSessionFlow({
  coupleId,
  userId,
  onClose,
}: {
  coupleId: string;
  userId: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("camera");
  const [shots, setShots] = useState<CapturedShot[]>([]);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

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

  function revokeAllAndReset() {
    shots.forEach((s) => URL.revokeObjectURL(s.url));
    setShots([]);
  }

  function handleDiscardAll() {
    revokeAllAndReset();
    onClose();
  }

  /**
   * Gửi TUẦN TỰ từng ảnh đã chọn (không Promise.all song song) — cố ý, vì
   * gửi song song nhiều file PNG nặng (giữ nguyên độ phân giải, xem
   * InstantCapture.tsx) cùng lúc dễ bão hoà băng thông upload trên mạng di
   * động, khiến TẤT CẢ đều chậm thay vì xong dần từng ảnh một.
   */
  async function handleSend(selected: CapturedShot[]) {
    if (selected.length === 0) return;
    setSending(true);
    setSendError(null);
    const supabase = createClient();

    try {
      for (const shot of selected) {
        const path = `${coupleId}/${userId}-${Date.now()}-${shot.id}.png`;
        const { error: upErr } = await supabase.storage
          .from("chat-images")
          .upload(path, shot.blob, { upsert: false, cacheControl: "31536000", contentType: "image/png" });
        if (upErr) throw upErr;

        const { data: pub } = supabase.storage.from("chat-images").getPublicUrl(path);
        const res = await sendStampPhoto(coupleId, pub.publicUrl, shot.width, shot.height, null);
        if (!res?.message) throw new Error("Gửi ảnh thất bại.");
      }

      revokeAllAndReset();
      router.push("/chat");
      onClose();
    } catch (err) {
      const raw = err instanceof Error ? err.message : String(err ?? "");
      setSendError(
        /exceeded the maximum allowed size/i.test(raw)
          ? "Có ảnh quá nặng để gửi. Vui lòng bỏ chọn ảnh đó và thử lại."
          : "Gửi ảnh thất bại, vui lòng thử lại."
      );
    } finally {
      setSending(false);
    }
  }

  if (step === "gallery") {
    return (
      <>
        <InstantGalleryGrid
          shots={shots}
          onBackToCamera={() => setStep("camera")}
          onRemove={handleRemove}
          onSend={handleSend}
          onDiscardAll={handleDiscardAll}
          sending={sending}
        />
        {sendError && (
          <div className="fixed inset-x-4 bottom-24 z-[60] rounded-xl bg-red-500 px-4 py-2.5 text-center text-sm text-white shadow-lg">
            {sendError}
          </div>
        )}
      </>
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
