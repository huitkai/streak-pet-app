/**
 * Khung "tem bưu chính" (perforated stamp edge) cho tính năng Chụp nhanh.
 *
 * Cấu trúc đúng như tem thật, gồm 2 lớp:
 *  1. Một viền giấy màu trắng ngà bao quanh ảnh (addStampBorder) — răng cưa
 *     được cắt vào LỚP VIỀN NÀY, không đụng vào nội dung ảnh. Đây là lý do
 *     tem thật luôn nhìn "sạch" dù răng cưa là các vết khoét: chúng cắt vào
 *     giấy trơn màu đều, không cắt trực tiếp lên chi tiết ảnh.
 *  2. Mặt nạ răng cưa (applyStampMask) khoét các lỗ bán nguyệt đều nhau dọc
 *     4 cạnh của LỚP VIỀN đó.
 *
 * Cách dựng lỗ: chia mỗi cạnh thành N đoạn bằng nhau, tại tâm mỗi đoạn "đục"
 * một hình tròn bán kính `holeRadius` nằm đúng trên đường biên (một nửa hình
 * tròn nằm trong, một nửa nằm ngoài) — phần nằm trong bị khoét đi.
 *
 * Cùng 1 hàm computeStampGrid() được dùng cho cả overlay preview (lúc đang
 * xem camera, không cần chính xác 100%) và applyStampMask() (bake thật vào
 * canvas cuối cùng) để 2 nơi luôn khớp nhau về mật độ răng cưa.
 */

export interface StampGrid {
  nx: number;
  ny: number;
  stepX: number;
  stepY: number;
}

/** Số răng cưa tối thiểu 3 mỗi cạnh để không bị nhìn giống hình chữ nhật trơn. */
function holeCountFor(length: number, holeRadius: number): number {
  return Math.max(3, Math.round(length / (holeRadius * 2)));
}

export function computeStampGrid(width: number, height: number, holeRadius: number): StampGrid {
  const nx = holeCountFor(width, holeRadius);
  const ny = holeCountFor(height, holeRadius);
  return { nx, ny, stepX: width / nx, stepY: height / ny };
}

/** Bán kính lỗ mặc định — tỉ lệ theo cạnh ngắn của khung (đã tính cả viền
 * trắng) để răng cưa to, tròn, rõ ràng như tem thật thay vì lấm tấm nhỏ vụn. */
export function defaultHoleRadius(width: number, height: number): number {
  return Math.max(12, Math.round(Math.min(width, height) * 0.05));
}

/** Độ dày viền giấy trắng ngà bao quanh ảnh trước khi đục răng cưa. */
export function defaultBorderWidth(width: number, height: number): number {
  return Math.max(16, Math.round(Math.min(width, height) * 0.06));
}

/**
 * Bọc 1 khung viền giấy màu trắng ngà quanh ảnh — bước bắt buộc TRƯỚC khi
 * gọi applyStampMask(), để răng cưa cắt vào viền giấy chứ không cắt thẳng
 * vào nội dung ảnh. Trả về canvas MỚI lớn hơn ảnh gốc `borderWidth` mỗi bên.
 */
export function addStampBorder(
  photoCanvas: HTMLCanvasElement,
  borderWidth?: number,
  borderColor = "#fffdf8"
): HTMLCanvasElement {
  const bw = borderWidth ?? defaultBorderWidth(photoCanvas.width, photoCanvas.height);
  const out = document.createElement("canvas");
  out.width = photoCanvas.width + bw * 2;
  out.height = photoCanvas.height + bw * 2;
  const ctx = out.getContext("2d");
  if (!ctx) return photoCanvas;

  ctx.fillStyle = borderColor;
  ctx.fillRect(0, 0, out.width, out.height);
  ctx.drawImage(photoCanvas, bw, bw);
  return out;
}

/**
 * Vẽ overlay khung tem đè lên video lúc đang xem (live preview). Chỉ mang
 * tính minh hoạ: video không có viền trắng thật (viền chỉ được thêm sau khi
 * chụp qua addStampBorder), nên overlay vẽ 1 khung mờ inset theo tỉ lệ viền
 * để gợi ý vùng ảnh cuối cùng sẽ có viền trắng + răng cưa bao quanh khoảng
 * đó. Hình dạng THẬT của ảnh ra được quyết định bởi addStampBorder() +
 * applyStampMask(), không phải overlay này.
 */
export function drawStampOverlay(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  holeRadius: number
) {
  ctx.clearRect(0, 0, width, height);

  // Khung gợi ý viền trắng sẽ xuất hiện quanh mép — inset nhẹ cho dễ hình dung.
  const hintInset = Math.round(Math.min(width, height) * 0.035);
  const innerW = width - hintInset * 2;
  const innerH = height - hintInset * 2;
  const { nx, ny, stepX, stepY } = computeStampGrid(innerW, innerH, holeRadius);

  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.85)";
  ctx.lineWidth = 1.5;
  ctx.setLineDash([2, 2]);

  const ring = (cx: number, cy: number) => {
    ctx.beginPath();
    ctx.arc(hintInset + cx, hintInset + cy, holeRadius, 0, Math.PI * 2);
    ctx.stroke();
  };

  for (let i = 0; i < nx; i++) {
    const cx = stepX * i + stepX / 2;
    ring(cx, 0);
    ring(cx, innerH);
  }
  for (let j = 0; j < ny; j++) {
    const cy = stepY * j + stepY / 2;
    ring(0, cy);
    ring(innerW, cy);
  }

  ctx.restore();
}

/**
 * Bake răng cưa THẬT vào ảnh: nhận vào 1 canvas (thường là ảnh đã qua
 * addStampBorder, tức đã có viền trắng), trả về 1 canvas MỚI có đúng hình
 * dạng răng cưa đó (alpha = 0 tại các lỗ khoét). Dùng
 * globalCompositeOperation "destination-out" để khoét alpha — không quan
 * trọng màu fill vì destination-out chỉ dùng alpha nguồn để trừ.
 *
 * Xuất ra bằng canvas.toBlob("image/png", ...) ở nơi gọi — BẮT BUỘC PNG để
 * giữ vùng trong suốt tại các lỗ khoét (JPEG không có alpha).
 */
export function applyStampMask(sourceCanvas: HTMLCanvasElement, holeRadius?: number): HTMLCanvasElement {
  const width = sourceCanvas.width;
  const height = sourceCanvas.height;
  const r = holeRadius ?? defaultHoleRadius(width, height);

  const out = document.createElement("canvas");
  out.width = width;
  out.height = height;
  const ctx = out.getContext("2d");
  if (!ctx) return sourceCanvas;

  ctx.drawImage(sourceCanvas, 0, 0, width, height);

  const { nx, ny, stepX, stepY } = computeStampGrid(width, height, r);
  ctx.globalCompositeOperation = "destination-out";
  ctx.fillStyle = "#000";

  const punch = (cx: number, cy: number) => {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  };

  for (let i = 0; i < nx; i++) {
    const cx = stepX * i + stepX / 2;
    punch(cx, 0);
    punch(cx, height);
  }
  for (let j = 0; j < ny; j++) {
    const cy = stepY * j + stepY / 2;
    punch(0, cy);
    punch(width, cy);
  }

  ctx.globalCompositeOperation = "source-over";
  return out;
}

/**
 * Tiện ích gộp 2 bước: bọc viền trắng + đục răng cưa, dùng trong
 * InstantCapture.tsx ngay sau khi chụp xong 1 khung hình.
 */
export function buildStampPhoto(
  photoCanvas: HTMLCanvasElement,
  options?: { borderWidth?: number; holeRadius?: number; borderColor?: string }
): HTMLCanvasElement {
  const bordered = addStampBorder(photoCanvas, options?.borderWidth, options?.borderColor);
  return applyStampMask(bordered, options?.holeRadius ?? defaultHoleRadius(bordered.width, bordered.height));
}
