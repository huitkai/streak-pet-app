/**
 * Khung "tem bưu chính" (perforated stamp edge) cho tính năng Chụp nhanh.
 *
 * Cách dựng: chia mỗi cạnh thành N đoạn bằng nhau, tại tâm mỗi đoạn "đục"
 * một hình tròn bán kính `holeRadius` nằm đúng trên đường biên (một nửa hình
 * tròn nằm trong ảnh, một nửa nằm ngoài) — phần nằm trong ảnh bị khoét đi,
 * tạo ra các vết lõm bán nguyệt liên tiếp dọc 4 cạnh, đúng kiểu răng cưa tem.
 *
 * Cùng 1 hàm computeStampGrid() được dùng cho cả:
 *  - overlay hiển thị lúc đang xem camera (preview, không cần chính xác 100%)
 *  - applyStampMask() bake thật vào canvas ảnh đã chụp (bắt buộc chính xác,
 *    vì đây là hình dạng sẽ lưu vào file PNG gửi đi)
 * để 2 nơi luôn khớp nhau, tránh trường hợp preview một kiểu, ảnh ra một kiểu.
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

/** Bán kính lỗ mặc định — tỉ lệ theo cạnh ngắn của ảnh để lỗ không bị quá to/nhỏ
 * bất kể ảnh chụp vuông hay dọc. */
export function defaultHoleRadius(width: number, height: number): number {
  return Math.max(8, Math.round(Math.min(width, height) * 0.035));
}

/**
 * Vẽ overlay khung tem đè lên video lúc đang xem (live preview). Chỉ mang
 * tính minh hoạ — vẽ các vòng tròn viền mỏng tại đúng vị trí lỗ sẽ bị khoét,
 * để người dùng thấy trước khung trước khi bấm chụp. Hình dạng THẬT của ảnh
 * ra được quyết định bởi applyStampMask(), không phải overlay này.
 */
export function drawStampOverlay(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  holeRadius: number
) {
  ctx.clearRect(0, 0, width, height);
  const { nx, ny, stepX, stepY } = computeStampGrid(width, height, holeRadius);

  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.85)";
  ctx.lineWidth = 1.5;
  ctx.setLineDash([2, 2]);

  const ring = (cx: number, cy: number) => {
    ctx.beginPath();
    ctx.arc(cx, cy, holeRadius, 0, Math.PI * 2);
    ctx.stroke();
  };

  for (let i = 0; i < nx; i++) {
    const cx = stepX * i + stepX / 2;
    ring(cx, 0);
    ring(cx, height);
  }
  for (let j = 0; j < ny; j++) {
    const cy = stepY * j + stepY / 2;
    ring(0, cy);
    ring(width, cy);
  }

  // Viền ngoài mảnh để gợi cảm giác "khung giấy" bao quanh khung hình.
  ctx.setLineDash([]);
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, width - 2, height - 2);
  ctx.restore();
}

/**
 * Bake răng cưa THẬT vào ảnh: nhận vào 1 canvas đã chứa ảnh chụp (pixel thật),
 * trả về 1 canvas MỚI có đúng hình dạng răng cưa đó (alpha = 0 tại các lỗ
 * khoét). Dùng globalCompositeOperation "destination-out" để khoét alpha —
 * không quan trọng màu fill vì destination-out chỉ dùng alpha nguồn để trừ.
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
