/**
 * lib/stamp-frame.ts
 *
 * Bake khung "tem" (viền lỗ tròn khoét lõm đều nhau, kiểu tem bưu chính)
 * TRỰC TIẾP vào pixel của ảnh — không phải CSS đè lên ảnh vuông.
 *
 * Cách làm: vẽ ảnh gốc vào canvas A, tạo canvas mask B (nền trắng đục lỗ
 * tròn dọc 4 cạnh bằng "destination-out"), rồi áp mask B lên canvas A bằng
 * "destination-in" -> phần lỗ trên A trở thành alpha=0 (trong suốt thật),
 * phần còn lại giữ nguyên pixel gốc. Xuất ra phải là PNG để giữ alpha.
 */

export interface StampMaskOptions {
  /** Bán kính mỗi lỗ khoét, tính bằng px trên canvas gốc. Mặc định 7 (~lỗ 14px/hole theo spacing mặc định). */
  holeRadius?: number;
  /** Khoảng cách tâm giữa 2 lỗ liền kề, tính bằng px. Mặc định 14 (đúng khoảng 12–16px/lỗ theo yêu cầu). */
  holeSpacing?: number;
}

const DEFAULT_HOLE_RADIUS = 7;
const DEFAULT_HOLE_SPACING = 14;

/**
 * Tính toạ độ tâm các lỗ dọc theo 1 cạnh có độ dài `length`, chia đều số lỗ
 * bằng Math.round(length / spacing) để lỗ ở 2 đầu cạnh không bị méo/lệch —
 * đảm bảo khoảng cách giữa các lỗ bằng nhau tuyệt đối trên toàn cạnh.
 */
function evenPositions(length: number, spacing: number): number[] {
  const count = Math.max(1, Math.round(length / spacing));
  const step = length / count;
  const positions: number[] = [];
  for (let i = 0; i <= count; i++) positions.push(i * step);
  return positions;
}

/**
 * Áp mask răng cưa (lỗ tròn) lên chính canvas ảnh đầu vào và trả về canvas
 * đó (mutate + return, để gọi trực tiếp `applyStampMask(canvas)` gọn ở nơi
 * dùng). Canvas đầu vào phải đã được vẽ ảnh (video frame / ảnh có sẵn) lên
 * trước đó.
 */
export function applyStampMask(
  canvas: HTMLCanvasElement,
  options?: StampMaskOptions
): HTMLCanvasElement {
  const holeRadius = options?.holeRadius ?? DEFAULT_HOLE_RADIUS;
  const holeSpacing = options?.holeSpacing ?? DEFAULT_HOLE_SPACING;
  const w = canvas.width;
  const h = canvas.height;

  const ctxA = canvas.getContext("2d");
  if (!ctxA) return canvas;

  // ---- canvas mask B: nền trắng đục lỗ tròn dọc 4 cạnh ----
  const maskCanvas = document.createElement("canvas");
  maskCanvas.width = w;
  maskCanvas.height = h;
  const ctxB = maskCanvas.getContext("2d");
  if (!ctxB) return canvas;

  ctxB.globalCompositeOperation = "source-over";
  ctxB.fillStyle = "#fff";
  ctxB.fillRect(0, 0, w, h);

  ctxB.globalCompositeOperation = "destination-out";
  const xs = evenPositions(w, holeSpacing);
  const ys = evenPositions(h, holeSpacing);

  const punchCircle = (cx: number, cy: number) => {
    ctxB.beginPath();
    ctxB.arc(cx, cy, holeRadius, 0, Math.PI * 2);
    ctxB.fill();
  };

  // cạnh trên & dưới
  for (const x of xs) {
    punchCircle(x, 0);
    punchCircle(x, h);
  }
  // cạnh trái & phải (bỏ 2 góc đã đục ở bước trên để khỏi trùng lặp không sao,
  // đục lại 1 lần nữa ở góc không ảnh hưởng vì cùng compositing "destination-out")
  for (const y of ys) {
    punchCircle(0, y);
    punchCircle(w, y);
  }

  // ---- áp mask B lên canvas A bằng destination-in ----
  ctxA.globalCompositeOperation = "destination-in";
  ctxA.drawImage(maskCanvas, 0, 0);
  ctxA.globalCompositeOperation = "source-over"; // reset để lần vẽ sau (nếu có) không bị ảnh hưởng

  return canvas;
}
