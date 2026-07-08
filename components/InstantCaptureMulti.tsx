"use client";

/**
 * Camera "Chụp nhanh" phiên bản CHỤP NHIỀU LIÊN TIẾP — dùng cho mục Chụp ảnh
 * tức thì NGOÀI màn hình chính (giống nút camera lướt ra của Instagram),
 * TÁCH RIÊNG khỏi <InstantCapture> trong khung chat (nơi bấm chụp là gửi
 * luôn 1 tấm, không có bước xem lại).
 *
 * Khác biệt cốt lõi so với InstantCapture.tsx:
 *  - Bấm chụp KHÔNG đóng camera và KHÔNG gửi ngay — ảnh (đã đóng khung tem
 *    thật, xem lib/stamp-frame.ts) được thêm vào danh sách `shots` và camera
 *    vẫn mở để chụp tiếp, y như hành vi "chụp nhiều tấm" của Instagram.
 *  - Có 1 nút tròn nhỏ ở góc hiện số ảnh đã chụp — bấm vào để sang màn hình
 *    xem danh sách dạng lưới (xem InstantGalleryGrid.tsx).
 *
 * Toàn bộ phần setup camera + bake khung tem + tách "chuyển cảnh" ra khỏi
 * "xử lý ảnh nặng" giữ NGUYÊN logic đã tối ưu ở InstantCapture.tsx (xem
 * comment trong file đó để hiểu rõ lý do).
 */

import { useEffect, useRef, useState } from "react";
import { XIcon, CameraFlipIcon, ChevronRightIcon } from "@/components/icons";
import { buildStampPhoto, defaultHoleRadius, drawStampOverlay } from "@/lib/stamp-frame";

const OUTPUT_ASPECT = 4 / 5;
const SAFETY_MAX_OUTPUT_WIDTH = 4096;

export interface CapturedShot {
  id: string;
  url: string;
  blob: Blob;
  width: number;
  height: number;
}

export default function InstantCaptureMulti({
  shots,
  onShot,
  onOpenGallery,
  onClose,
}: {
  shots: CapturedShot[];
  onShot: (shot: CapturedShot) => void;
  onOpenGallery: () => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const overlayRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facing, setFacing] = useState<"user" | "environment">("user");
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [flashing, setFlashing] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function start() {
      setReady(false);
      setError(null);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: facing,
            width: { ideal: 1920 },
            height: { ideal: 1920 },
            aspectRatio: { ideal: OUTPUT_ASPECT },
          },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        const [track] = stream.getVideoTracks();
        if (track && typeof track.getCapabilities === "function") {
          try {
            const caps = track.getCapabilities();
            const maxW = caps.width?.max;
            const maxH = caps.height?.max;
            if (maxW && maxH) {
              await track.applyConstraints({ width: { ideal: maxW }, height: { ideal: maxH } });
            }
          } catch {
            // Thiết bị không cho áp constraint mới — vẫn dùng stream ban đầu.
          }
        }

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setReady(true);
      } catch {
        setError("Không thể mở camera. Vui lòng cấp quyền camera cho trình duyệt.");
      }
    }
    start();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [facing]);

  useEffect(() => {
    const canvas = overlayRef.current;
    if (!canvas || !ready) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    function resize() {
      const c = overlayRef.current;
      const p = c?.parentElement;
      if (!c || !p) return;
      c.width = p.clientWidth;
      c.height = p.clientHeight;
      const ctx = c.getContext("2d");
      if (!ctx) return;
      drawStampOverlay(ctx, c.width, c.height, defaultHoleRadius(c.width, c.height));
    }

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(parent);
    return () => ro.disconnect();
  }, [ready]);

  function handleCapture() {
    const video = videoRef.current;
    if (!video || !ready) return;

    const vw = video.videoWidth;
    const vh = video.videoHeight;
    if (!vw || !vh) return;
    const videoAspect = vw / vh;
    let sx = 0, sy = 0, sw = vw, sh = vh;
    if (videoAspect > OUTPUT_ASPECT) {
      sw = vh * OUTPUT_ASPECT;
      sx = (vw - sw) / 2;
    } else {
      sh = vw / OUTPUT_ASPECT;
      sy = (vh - sh) / 2;
    }

    const outputWidth = Math.min(SAFETY_MAX_OUTPUT_WIDTH, Math.round(sw));
    const outputHeight = Math.round(outputWidth / OUTPUT_ASPECT);

    const shot = document.createElement("canvas");
    shot.width = outputWidth;
    shot.height = outputHeight;
    const ctx = shot.getContext("2d");
    if (!ctx) return;

    if (facing === "user") {
      ctx.translate(outputWidth, 0);
      ctx.scale(-1, 1);
    }

    // Nháy trắng ngay lúc bấm chụp để phản hồi tức thì — khác với
    // InstantCapture (chụp 1 tấm rồi đóng), ở đây camera VẪN MỞ nên nháy
    // trắng vẫn kịp hiển thị trọn vẹn cho người dùng thấy, không cần dời
    // thời điểm gọi như bên kia.
    setFlashing(true);
    window.setTimeout(() => setFlashing(false), 180);

    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, outputWidth, outputHeight);

    // Nhường 1 tick cho hiệu ứng nháy trắng kịp vẽ trước khi xử lý CPU nặng
    // (đóng viền tem + khoét răng cưa + encode PNG) — tránh giật hình.
    window.setTimeout(() => {
      const stamped = buildStampPhoto(shot);
      stamped.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        onShot({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          url,
          blob,
          width: stamped.width,
          height: stamped.height,
        });
      }, "image/png");
    }, 0);
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <div className="relative flex-1 overflow-hidden">
        <video
          ref={videoRef}
          playsInline
          muted
          className={`h-full w-full object-cover ${facing === "user" ? "-scale-x-100" : ""}`}
        />
        <canvas ref={overlayRef} className="pointer-events-none absolute inset-0 h-full w-full" />

        {flashing && <div className="pointer-events-none absolute inset-0 bg-white animate-stamp-flash" />}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 px-8 text-center text-sm text-white">
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng camera"
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur"
        >
          <XIcon className="h-5 w-5" />
        </button>

        <button
          type="button"
          onClick={() => setFacing((f) => (f === "user" ? "environment" : "user"))}
          aria-label="Đổi camera"
          className="absolute left-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur"
        >
          <CameraFlipIcon className="h-5 w-5" />
        </button>
      </div>

      {/* Thanh dưới: preview ảnh vừa chụp (giống tray của Instagram) bên
          trái, nút chụp ở giữa, nút "sang danh sách" bên phải — chỉ hiện khi
          đã chụp ít nhất 1 tấm. */}
      <div className="safe-bottom relative flex items-center justify-center gap-4 bg-black px-6 py-6">
        <div className="flex h-14 w-14 items-center justify-center">
          {shots.length > 0 && (
            <button
              type="button"
              onClick={onOpenGallery}
              aria-label="Xem ảnh đã chụp"
              className="relative h-12 w-12 overflow-hidden rounded-xl border-2 border-white/80 active:scale-95"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={shots[shots.length - 1].url} alt="" className="h-full w-full object-cover" />
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={handleCapture}
          disabled={!ready}
          aria-label="Chụp"
          className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-white bg-white/20 active:scale-95 disabled:opacity-40"
        >
          <span className="h-12 w-12 rounded-full bg-white" />
        </button>

        <div className="flex h-14 w-14 items-center justify-center">
          {shots.length > 0 && (
            <button
              type="button"
              onClick={onOpenGallery}
              aria-label={`Xem ${shots.length} ảnh đã chụp`}
              className="flex items-center gap-1 rounded-full bg-white/20 px-3 py-2 text-sm font-semibold text-white backdrop-blur active:scale-95"
            >
              {shots.length}
              <ChevronRightIcon className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
