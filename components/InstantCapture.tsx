"use client";

import { useEffect, useRef, useState } from "react";
import { applyStampMask } from "@/lib/stamp-frame";
import { XIcon, CameraIcon } from "@/components/icons";

/** Kích thước khung tem xuất ra (vuông) — khớp với canvas dùng để bake mask. */
const OUTPUT_SIZE = 720;

interface InstantCaptureProps {
  /** Gọi khi đã có PNG (đã bake răng cưa) sẵn sàng để upload + gửi. */
  onCapture: (file: Blob) => void;
  onClose: () => void;
}

/**
 * Camera live full-screen kiểu Locket. Khung tem (viền lỗ tròn khoét đều)
 * được overlay lên viewfinder bằng CSS mask-image để người dùng thấy trước
 * hình dạng — NHƯNG hình dạng thật sự nằm trong file ảnh chỉ được bake ở
 * bước chụp (xem lib/stamp-frame.ts), không phải CSS này.
 */
export default function InstantCapture({ onCapture, onClose }: InstantCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "user" }, audio: false })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) setError("Không mở được camera. Hãy kiểm tra quyền truy cập.");
      });

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  async function handleShutter() {
    const video = videoRef.current;
    if (!video || capturing) return;
    setCapturing(true);

    try {
      // 1. Vẽ frame hiện tại của video vào canvas vuông (crop giữa khung hình).
      const canvas = document.createElement("canvas");
      canvas.width = OUTPUT_SIZE;
      canvas.height = OUTPUT_SIZE;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Không tạo được canvas.");

      const vw = video.videoWidth;
      const vh = video.videoHeight;
      const side = Math.min(vw, vh);
      const sx = (vw - side) / 2;
      const sy = (vh - side) / 2;

      // Lật ngang vì camera trước (facingMode: user) nên hiện như gương.
      ctx.translate(OUTPUT_SIZE, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, sx, sy, side, side, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
      ctx.setTransform(1, 0, 0, 1, 0, 0);

      // 2. Bake khung tem (lỗ tròn) trực tiếp vào pixel của canvas.
      applyStampMask(canvas, { holeRadius: 8, holeSpacing: 16 });

      // 3. Xuất PNG (giữ alpha ở phần lỗ khoét).
      const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blob) throw new Error("Xuất ảnh thất bại.");

      onCapture(blob);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chụp ảnh thất bại.");
    } finally {
      setCapturing(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <button
        type="button"
        onClick={onClose}
        aria-label="Đóng camera"
        className="absolute right-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur"
      >
        <XIcon className="h-5 w-5" />
      </button>

      <div className="relative flex flex-1 items-center justify-center overflow-hidden">
        {error ? (
          <p className="px-8 text-center text-sm text-white/80">{error}</p>
        ) : (
          <div className="relative aspect-square w-full max-w-md">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="h-full w-full object-cover"
              style={{ transform: "scaleX(-1)" }}
            />
            {/* Overlay CHỈ để xem trước hình dạng khung tem — ảnh thật được bake
                trực tiếp vào pixel ở canvas lúc bấm chụp (xem handleShutter).
                4 dải viền riêng biệt, mỗi dải là 1 hàng lỗ tròn khoét đều
                bằng mask-image repeating-radial-gradient (không dùng
                clip-path zigzag vì đó là cạnh nhọn, không phải lỗ tròn). */}
            {(["top", "bottom", "left", "right"] as const).map((edge) => {
              const horizontal = edge === "top" || edge === "bottom";
              const thickness = 16; // = holeSpacing dùng ở canvas thật (px hiển thị, không cần khớp chính xác vì chỉ preview)
              const scallop =
                "repeating-radial-gradient(circle at 50% 50%, transparent 0 6px, black 6.5px calc(50% + 0.5px))";
              return (
                <div
                  key={edge}
                  aria-hidden
                  className="pointer-events-none absolute bg-[#faf6ee]"
                  style={{
                    top: edge === "top" ? 0 : edge === "bottom" ? undefined : 0,
                    bottom: edge === "bottom" ? 0 : undefined,
                    left: edge === "left" ? 0 : edge === "right" ? undefined : 0,
                    right: edge === "right" ? 0 : undefined,
                    height: horizontal ? thickness : "100%",
                    width: horizontal ? "100%" : thickness,
                    maskImage: scallop,
                    WebkitMaskImage: scallop,
                    maskRepeat: horizontal ? "repeat-x" : "repeat-y",
                    WebkitMaskRepeat: horizontal ? "repeat-x" : "repeat-y",
                    maskSize: horizontal ? `${thickness}px ${thickness}px` : `${thickness}px ${thickness}px`,
                    WebkitMaskSize: horizontal ? `${thickness}px ${thickness}px` : `${thickness}px ${thickness}px`,
                  }}
                />
              );
            })}
          </div>
        )}
      </div>

      <div className="flex items-center justify-center pb-10 pt-4">
        <button
          type="button"
          onClick={handleShutter}
          disabled={!ready || capturing || !!error}
          aria-label="Chụp"
          className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-white bg-white/20 disabled:opacity-40"
        >
          {capturing ? (
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <CameraIcon className="h-6 w-6 text-white" />
          )}
        </button>
      </div>
    </div>
  );
}
