"use client";

/**
 * Điều phối luồng "Chụp ảnh tức thì" NGOÀI màn hình chính (mở từ nút camera
 * trong ConversationListClient, tách biệt hoàn toàn khỏi Chụp nhanh trong
 * khung chat — xem components/InstantCapture.tsx):
 *
 *   camera (chụp nhiều tấm liên tiếp, mỗi tấm rơi vào danh sách)
 *     -> gallery (xem lưới ảnh, bỏ chọn/xoá ảnh không ưng)
 *     -> gửi các ảnh đã chọn vào cuộc trò chuyện, rồi điều hướng sang /chat
 *
 * QUAN TRỌNG — bản sửa lỗi "chụp xong thoát ra là mất, không xem lại được":
 * Trước đây `shots` chỉ là React state sống trong component này, unmount là
 * mất trắng. Giờ MỌI thay đổi lên `shots` đều đồng bộ 2 chiều với IndexedDB
 * (xem lib/instant-shots-store.ts): chụp xong lưu ngay, xoá thì xoá luôn bản
 * lưu, gửi xong thì xoá bản lưu của đúng ảnh đã gửi (ảnh nào chưa chọn gửi
 * vẫn còn nguyên). Nhờ vậy đóng camera/tắt app rồi mở lại, danh sách ảnh
 * chưa gửi vẫn còn đủ — xem qua nút "Xem ảnh đã lưu" trong InstantCaptureMulti.
 *
 * Việc upload lên Storage + gọi sendStampPhoto tái dùng ĐÚNG cách mã hoá nội
 * dung (encodeStampPhoto qua sendStampPhoto) mà ChatBox.handleStampCapture
 * đang dùng cho Chụp nhanh trong chat, để 2 nơi hiển thị bong bóng ảnh giống
 * hệt nhau (không viền/không bo góc, giữ nguyên hình dạng PNG đã đục lỗ).
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import InstantCaptureMulti, { type CapturedShot } from "@/components/InstantCaptureMulti";
import InstantGalleryGrid from "@/components/InstantGalleryGrid";
import { createClient } from "@/lib/supabase/client";
import { sendStampPhoto } from "@/lib/actions";
import { listDraftShots, saveDraftShot, deleteDraftShot, deleteDraftShots, clearDraftShots } from "@/lib/instant-shots-store";

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

  // Nạp lại TOÀN BỘ ảnh nháp đã lưu từ những lần chụp trước (kể cả phiên đã
  // đóng từ lâu) ngay khi mở camera lên — đây là phần cốt lõi sửa lỗi "mất
  // ảnh khi thoát ra".
  useEffect(() => {
    let cancelled = false;
    listDraftShots().then((stored) => {
      if (cancelled) return;
      setShots(stored.map((s) => ({ id: s.id, url: URL.createObjectURL(s.blob), blob: s.blob, width: s.width, height: s.height })));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  function handleShot(shot: CapturedShot) {
    setShots((prev) => [...prev, shot]);
    saveDraftShot({ id: shot.id, blob: shot.blob, width: shot.width, height: shot.height, createdAt: Date.now() }).catch(
      (e) => console.error("Lưu ảnh nháp thất bại", e)
    );
  }

  function handleRemove(id: string) {
    setShots((prev) => {
      const target = prev.find((s) => s.id === id);
      if (target) URL.revokeObjectURL(target.url);
      return prev.filter((s) => s.id !== id);
    });
    deleteDraftShot(id).catch((e) => console.error("Xoá ảnh nháp thất bại", e));
  }

  function handleDiscardAll() {
    shots.forEach((s) => URL.revokeObjectURL(s.url));
    setShots([]);
    clearDraftShots().catch((e) => console.error("Xoá toàn bộ ảnh nháp thất bại", e));
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
    const sentIds: string[] = [];

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
        sentIds.push(shot.id);
      }

      // Chỉ xoá bản nháp của ĐÚNG các ảnh đã gửi thành công — ảnh nào người
      // dùng không chọn gửi lần này vẫn giữ nguyên làm nháp cho lần sau.
      await removeSentDrafts(sentIds);
      router.push("/chat");
      onClose();
    } catch (err) {
      // Gửi dở giữa chừng: các ảnh ĐÃ gửi thành công (sentIds) vẫn nên xoá
      // khỏi nháp để không bị gửi trùng khi bấm gửi lại — ảnh gây lỗi và các
      // ảnh sau đó vẫn giữ nguyên trong danh sách để người dùng thử lại.
      if (sentIds.length > 0) await removeSentDrafts(sentIds);
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

  async function removeSentDrafts(sentIds: string[]) {
    const sentSet = new Set(sentIds);
    setShots((prev) => {
      prev.filter((s) => sentSet.has(s.id)).forEach((s) => URL.revokeObjectURL(s.url));
      return prev.filter((s) => !sentSet.has(s.id));
    });
    await deleteDraftShots(sentIds).catch((e) => console.error("Xoá ảnh nháp đã gửi thất bại", e));
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
      onClose={onClose}
    />
  );
}
