/**
 * Khung "tem bưu chính" (perforated stamp edge) cho tính năng Chụp nhanh.
 *
 * Cấu trúc đúng như tem thật, gồm 2 lớp:
 *  1. Một viền giấy màu trắng ngà bao quanh ảnh (addStampBorder) — răng cưa
 *     được cắt vào LỚP VIỀN NÀY, không đụng vào nội dung ảnh. Đây là lý do
 *     tem thật luôn nhìn "sạch" dù răng cưa là các vết khoét: chúng cắt vào
 *     giấy trơn màu đều, không cắt trực tiếp lên chi tiết ảnh.
 *  2. Mặt nạ răng cưa (applyStampMask) khoét các lỗ bán nguyệt đều nhau dọc
 *     toàn bộ chu vi của LỚP VIỀN đó.
 *
 * QUAN TRỌNG — vì sao dùng "chu vi liên tục" thay vì tính riêng từng cạnh:
 * Nếu tính số lỗ/khoảng cách RIÊNG cho mỗi cạnh (trên/dưới/trái/phải độc
 * lập), 2 cạnh gặp nhau ở góc sẽ không khớp pha với nhau — mỗi cạnh có lỗ
 * đầu tiên cách góc 1 khoảng khác nhau, tạo ra 1 khúc thừa/lệch nhìn thấy rõ
 * ngay tại góc. Cách đúng: coi toàn bộ 4 cạnh là 1 vòng chu vi duy nhất,
 * chia đều số lỗ dọc theo chiều dài chu vi đó rồi "đi bộ" 1 vòng để đặt lỗ —
 * đảm bảo mật độ lỗ liền mạch qua góc, không bị thừa/thiếu ở bất kỳ đâu.
 *
 * Cùng 1 hàm computeStampPerimeterPoints() được dùng cho cả overlay preview
 * (lúc đang xem camera, không cần chính xác 100%) và applyStampMask() (bake
 * thật vào canvas cuối cùng) để 2 nơi luôn khớp nhau về mật độ răng cưa.
 */

export interface Point {
  x: number;
  y: number;
}

/**
 * Tính vị trí các tâm lỗ dọc theo TOÀN BỘ chu vi hình chữ nhật (width x
 * height), đi 1 vòng liên tục theo chiều kim đồng hồ bắt đầu từ góc trên-trái
 * (điểm (0,0)) → cạnh trên → cạnh phải → cạnh dưới → cạnh trái → về lại góc
 * ban đầu. Nhờ đi liên tục nên KHÔNG có chuyện lệch pha giữa 2 cạnh tại góc.
 *
 * `gap` là khoảng hở giữa mép 2 lỗ liền kề (KHÔNG phải khoảng cách tâm).
 * QUAN TRỌNG: nếu gap = 0 (2 lỗ đặt tiếp xúc nhau) thì điểm chạm giữa 2 hình
 * tròn về mặt hình học là 1 đỉnh nhọn góc 0° — đây là nguyên nhân răng cưa
 * nhìn nhọn/sắc thay vì các u tròn mềm mại như tem thật. Phải luôn chừa 1
 * khoảng hở dương để giữa 2 lỗ còn lại 1 dải giấy có bề rộng thật.
 */
export function computeStampPerimeterPoints(
  width: number,
  height: number,
  holeRadius: number,
  gap: number = holeRadius * 0.6
): Point[] {
  const period = holeRadius * 2 + gap;

  // QUAN TRỌNG: neo 1 lỗ đúng vào MỖI GÓC thay vì lệch pha nửa chu kỳ để
  // "né" góc như trước. Lý do: khi đi theo chu vi bằng khoảng cách cung
  // (arc-length) rồi rẽ 90° ở góc, khoảng cách ĐƯỜNG THẲNG thực tế giữa 2 lỗ
  // liền kề tại góc ngắn hơn hẳn khoảng cách cung — khiến các lỗ quanh góc
  // nhìn sát/dư hơn các lỗ giữa cạnh thẳng dù "cách đều" theo chu vi.
  // Neo lỗ vào góc + chia đều riêng cho từng cạnh (từ góc này sang góc kia)
  // đảm bảo khoảng cách hình học thật giữa mọi lỗ liền kề bằng nhau, kể cả
  // 2 lỗ nằm 2 bên 1 góc.
  const edges: Array<{ length: number; from: Point; dir: Point }> = [
    { length: width, from: { x: 0, y: 0 }, dir: { x: 1, y: 0 } }, // trên
    { length: height, from: { x: width, y: 0 }, dir: { x: 0, y: 1 } }, // phải
    { length: width, from: { x: width, y: height }, dir: { x: -1, y: 0 } }, // dưới
    { length: height, from: { x: 0, y: height }, dir: { x: 0, y: -1 } }, // trái
  ];

  const points: Point[] = [];
  for (const edge of edges) {
    // Số đoạn dọc theo cạnh này (không tính điểm cuối — điểm cuối chính là
    // góc bắt đầu của cạnh tiếp theo, đã được thêm ở vòng lặp sau).
    const segments = Math.max(1, Math.round(edge.length / period));
    const step = edge.length / segments;
    for (let i = 0; i < segments; i++) {
      const s = i * step;
      points.push({ x: edge.from.x + edge.dir.x * s, y: edge.from.y + edge.dir.y * s });
    }
  }
  return points;
}

/** Bán kính lỗ mặc định — tỉ lệ theo cạnh ngắn của khung (đã tính cả viền
 * trắng). Giữ tỉ lệ viền/bán-kính đủ lớn (xem defaultBorderWidth) để lỗ
 * không chạm vào nội dung ảnh bên trong. */
export function defaultHoleRadius(width: number, height: number): number {
  return Math.max(10, Math.round(Math.min(width, height) * 0.04));
}

/** Độ dày viền giấy trắng ngà bao quanh ảnh trước khi đục răng cưa — cố ý
 * lớn hơn hẳn bán kính lỗ (~1.5x) để lỗ không bao giờ ăn vào nội dung ảnh
 * và phần "thịt" giấy quanh mỗi lỗ đủ dày, nhìn mềm mại thay vì mỏng dính. */
export function defaultBorderWidth(width: number, height: number): number {
  return Math.max(16, Math.round(Math.min(width, height) * 0.07));
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
  const points = computeStampPerimeterPoints(innerW, innerH, holeRadius);

  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.85)";
  ctx.lineWidth = 1.5;
  ctx.setLineDash([2, 2]);

  for (const p of points) {
    ctx.beginPath();
    ctx.arc(hintInset + p.x, hintInset + p.y, holeRadius, 0, Math.PI * 2);
    ctx.stroke();
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

  const points = computeStampPerimeterPoints(width, height, r);
  ctx.globalCompositeOperation = "destination-out";
  ctx.fillStyle = "#000";

  for (const p of points) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fill();
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
