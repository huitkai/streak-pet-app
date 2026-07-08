"use client";

/**
 * "Chụp nhanh" kiểu Locket: mở camera trước full-screen, khung tem răng cưa
 * hiện ngay trên viewfinder, bấm chụp là gửi luôn (không có bước xem trước
 * ảnh rồi mới xác nhận gửi). Hình dạng răng cưa được BAKE THẬT vào file PNG
 * xuất ra (xem lib/stamp-frame.ts) — không phải chỉ là CSS đè lên ảnh vuông.
 */

import { useEffect, useRef, useState } from "react";
import { XIcon, CameraFlipIcon } from "@/components/icons";
import { buildStampPhoto, defaultHoleRadius, drawStampOverlay } from "@/lib/stamp-frame";

/** Tỉ lệ khung ảnh xuất ra — dọc 4:5 giống khung ảnh Locket/Instagram, không
 * lấy nguyên khung video (thường 16:9) để tránh ảnh quá dẹt. */
const OUTPUT_ASPECT = 4 / 5;
/** Chặn trần độ rộng ảnh xuất ra — vẫn tôn trọng độ phân giải camera thật đo
 * được, nhưng không để PNG (bắt buộc PNG để giữ vùng trong suốt răng cưa)
 * phình quá to trên các máy có camera 4K+. */
const MAX_OUTPUT_WIDTH = 1600;

export default function InstantCapture({
  onCapture,
  onClose,
}: {
  onCapture: (blob: Blob, width: number, height: number) => void;
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
        // Bước 1: mở camera trước với ràng buộc "ideal" tương đối cao chỉ để
        // có 1 track hợp lệ — chưa chắc đã là độ phân giải cao nhất máy hỗ
        // trợ, vì browser có thể chọn preset thấp hơn ideal nếu muốn.
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

        // Bước 2: hỏi thẳng track xem CAMERA THẬT SỰ hỗ trợ độ phân giải tối
        // đa bao nhiêu (getCapabilities().width/height.max), rồi áp lại đúng
        // mức max đó bằng applyConstraints — đây là cách chắc chắn nhất để
        // lấy ảnh nét nhất máy cho phép, thay vì đoán 1 con số cố định.
        // Không phải browser/thiết bị nào cũng hỗ trợ getCapabilities (Safari
        // cũ, một số Android WebView), nên luôn bọc try/catch và coi đây là
        // bước "cố gắng thêm", không phải bước bắt buộc.
        const [track] = stream.getVideoTracks();
        if (track && typeof track.getCapabilities === "function") {
          try {
            const caps = track.getCapabilities();
            const maxW = caps.width?.max;
            const maxH = caps.height?.max;
            if (maxW && maxH) {
              await track.applyConstraints({
                width: { ideal: maxW },
                height: { ideal: maxH },
              });
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

  // Vẽ lại overlay khung tem mỗi khi kích thước khung xem đổi (chỉ để xem
  // trước — hình dạng thật được bake lúc chụp bằng applyStampMask).
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

    // Crop giữa khung hình video theo đúng tỉ lệ OUTPUT_ASPECT (kiểu
    // object-cover) trước khi vẽ vào canvas xuất ra.
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

    // sw ở đây là bề rộng vùng crop THẬT lấy từ khung hình camera (đã theo
    // đúng tỉ lệ OUTPUT_ASPECT) — dùng chính giá trị này để suy ra độ phân
    // giải ảnh xuất ra, thay vì 1 hằng số cố định, để tận dụng đúng độ nét
    // camera thật sự cung cấp (đã detect + áp max ở bước mở camera).
    // Vẫn chặn trần bằng MAX_OUTPUT_WIDTH để PNG không phình quá to trên máy
    // có camera độ phân giải rất cao.
    const outputWidth = Math.min(MAX_OUTPUT_WIDTH, Math.round(sw));
    const outputHeight = Math.round(outputWidth / OUTPUT_ASPECT);

    const shot = document.createElement("canvas");
    shot.width = outputWidth;
    shot.height = outputHeight;
    const ctx = shot.getContext("2d");
    if (!ctx) return;

    // Camera trước thì lật ngang cho giống soi gương (đúng cảm giác selfie).
    if (facing === "user") {
      ctx.translate(outputWidth, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, outputWidth, outputHeight);

    const stamped = buildStampPhoto(shot);

    setFlashing(true);
    window.setTimeout(() => setFlashing(false), 180);

    stamped.toBlob(
      (blob) => {
        if (blob) onCapture(blob, stamped.width, stamped.height);
      },
      "image/png" // bắt buộc PNG để giữ vùng trong suốt tại các lỗ răng cưa
    );
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

      <div className="flex items-center justify-center bg-black py-6">
        <button
          type="button"
          onClick={handleCapture}
          disabled={!ready}
          aria-label="Chụp"
          className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-white bg-white/20 active:scale-95 disabled:opacity-40"
        >
          <span className="h-12 w-12 rounded-full bg-white" />
        </button>
      </div>
    </div>
  );
}
