/**
 * Khung "tem bưu chính" (perforated stamp edge) cho tính năng Chụp nhanh.
 *
 * BẢN THIẾT KẾ LẠI (v3) — chuyển sang đúng NGÔN NGỮ THIẾT KẾ của tem bưu
 * chính THẬT (tham khảo 1 bộ tem thời trang Ý thật: khung mảnh sát ảnh, chữ
 * hạng mục chạy dọc theo mép trái, tên quốc gia góc trên-phải, mệnh giá góc
 * dưới-phải, dải viền màu trang trí thuần tuý không chữ ở ngoài cùng), thay
 * vì phong cách "sticker tem cổ" nhiều hoa văn/hoen ố của bản v2. Khác biệt
 * chính so với v2:
 *
 *  - BỎ khung đôi + hoa văn hình thoi góc, BỎ các đốm "hoen ố" giả cổ →
 *    thay bằng 1 NÉT KHUNG DUY NHẤT sát mép ảnh (đúng như tem thật: khung
 *    mảnh ôm sát nội dung, dải màu ngoài khung là trang trí thuần tuý).
 *  - BỎ dấu mộc bưu điện chữ chạy cung tròn (dấu mộc chỉ xuất hiện trên tem
 *    ĐÃ QUA SỬ DỤNG, không phải thiết kế gốc của tem) → thay bằng bộ nhãn
 *    chữ đúng vị trí tem thật: nhãn hạng mục dọc theo mép trái, nhãn ngắn
 *    góc trên-phải, ngày chụp góc dưới-trái, mệnh giá kiểu "N. xx" góc
 *    dưới-phải — tất cả đặt trong dải viền màu (không đè lên ảnh người
 *    dùng, vì ảnh chụp thật không có sẵn "khoảng trống" để đặt chữ như tem
 *    thương mại được thiết kế sẵn bố cục).
 *  - Vẫn giữ vân giấy rất nhẹ (in ấn thật cũng có kết cấu giấy) nhưng bỏ lớp
 *    "hoen ố" vì nó khiến tem nhìn cũ/bẩn thay vì tem mới in sạch sẽ.
 *
 * ---- Cấu trúc 2 lớp giữ nguyên từ các bản trước ----
 *  1. Một viền giấy màu (lấy tông từ ảnh, xem extractDominantAccent) bao
 *     quanh ảnh (addStampBorder) — răng cưa cắt vào LỚP VIỀN NÀY, không
 *     đụng vào nội dung ảnh.
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

export interface StampAccent {
  /** Màu viền giấy — lấy hue thật từ ảnh (xem extractDominantAccent), vẫn
   * giữ độ sáng cao + bão hoà vừa phải để đọc như giấy in tem chứ không
   * thành 1 mảng màu phẳng chói mắt. */
  border: string;
  /** Màu "mực" đậm cùng tông, dùng để in khung + các nhãn chữ — tương phản
   * đủ để đọc được trên nền viền nhạt. */
  ink: string;
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  const d = max - min;
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case r: h = ((g - b) / d) % 6; break;
      case g: h = (b - r) / d + 2; break;
      default: h = (r - g) / d + 4;
    }
    h *= 60;
    if (h < 0) h += 360;
  }
  return [h, s, l];
}

function hslToCss(h: number, s: number, l: number): string {
  return `hsl(${Math.round(h)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`;
}

/**
 * Tìm tông màu chủ đạo của ảnh bằng HISTOGRAM THEO HUE, lấy mẫu thưa (mỗi
 * 6px) toàn bộ canvas — thay cho cách cộng trung bình RGB trực tiếp, vì ảnh
 * thật hầu như luôn có nhiều vùng màu khác nhau cùng lúc (áo, da, nền...);
 * cộng trung bình trực tiếp khiến các hue đối lập triệt tiêu nhau và kết
 * quả gần như luôn ra 1 màu nâu xám bất kể ảnh gốc.
 *
 * Cách làm: chia vòng hue 360° thành 24 khoang 15°/khoang, mỗi pixel màu
 * (bỏ qua pixel gần trung tính s<0.12 vì không mang thông tin sắc độ) cộng
 * "khối lượng" bão hoà bình phương (s²) vào đúng khoang của nó — pixel càng
 * rực càng có tiếng nói. Khoang nặng nhất chính là tông màu THỰC SỰ chiếm
 * ưu thế trong ảnh, giống cách mắt người nhận diện "ảnh này tông xanh lá"
 * hay "tông cam hoàng hôn" dù ảnh có chi tiết lộn xộn.
 */
export function extractDominantAccent(photoCanvas: HTMLCanvasElement): StampAccent {
  const ctx = photoCanvas.getContext("2d");
  if (!ctx) return { border: "#f2e6cc", ink: "#8a7a5c" };

  const { width, height } = photoCanvas;
  const step = 6;
  const data = ctx.getImageData(0, 0, width, height).data;

  const BINS = 24;
  const binWeight = new Array(BINS).fill(0);
  const binSat = new Array(BINS).fill(0);
  const binLight = new Array(BINS).fill(0);
  let totalWeight = 0;
  let sampleCount = 0;

  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const i = (y * width + x) * 4;
      const r = data[i], g = data[i + 1], b = data[i + 2];
      sampleCount++;
      const [h, s, l] = rgbToHsl(r, g, b);
      if (s < 0.12) continue; // pixel gần trung tính -> bỏ, không mang hue
      const bin = Math.floor(h / (360 / BINS)) % BINS;
      const weight = s * s;
      binWeight[bin] += weight;
      binSat[bin] += s * weight;
      binLight[bin] += l * weight;
      totalWeight += weight;
    }
  }

  let best = 0;
  for (let i = 1; i < BINS; i++) if (binWeight[i] > binWeight[best]) best = i;

  // Ảnh gần như không màu (thiếu sáng, hoặc thật sự đen trắng): tỉ lệ pixel
  // có màu quá thấp để tin cậy -> rơi về màu kem trung tính, an toàn hơn là
  // "ép" ra 1 hue ngẫu nhiên từ nhiễu.
  const colorRatio = totalWeight / Math.max(1, sampleCount);
  const hasColor = colorRatio > 0.01 && binWeight[best] > 0;

  const CREAM_HUE = 38;
  const domHue = hasColor ? (best + 0.5) * (360 / BINS) : CREAM_HUE;
  const domSat = hasColor ? binSat[best] / binWeight[best] : 0.12;
  const domLight = hasColor ? binLight[best] / binWeight[best] : 0.7;

  // Viền giấy: chỉ pha 20% về hue kem cố định để giữ chất "giấy in", 80%
  // còn lại giữ đúng hue chủ đạo của ảnh.
  const borderHue = hasColor ? CREAM_HUE * 0.2 + domHue * 0.8 : CREAM_HUE;
  const borderSat = hasColor ? Math.min(0.5, Math.max(0.24, domSat * 0.85)) : 0.13;
  const borderLight = hasColor ? Math.min(0.91, Math.max(0.82, domLight * 0.35 + 0.65)) : 0.93;
  const border = hslToCss(borderHue, borderSat, borderLight);

  // Mực: cùng hue, tăng bão hoà + hạ độ sáng để tương phản, đọc rõ các nhãn
  // chữ và khung trên nền viền nhạt.
  const inkSat = hasColor ? Math.max(0.38, domSat) : 0.16;
  const ink = hslToCss(domHue, inkSat, 0.24);

  return { border, ink };
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
  // "né" góc. Lý do: khi đi theo chu vi bằng khoảng cách cung (arc-length)
  // rồi rẽ 90° ở góc, khoảng cách ĐƯỜNG THẲNG thực tế giữa 2 lỗ liền kề tại
  // góc ngắn hơn hẳn khoảng cách cung — khiến các lỗ quanh góc nhìn sát/dư
  // hơn các lỗ giữa cạnh thẳng dù "cách đều" theo chu vi. Neo lỗ vào góc +
  // chia đều riêng cho từng cạnh (từ góc này sang góc kia) đảm bảo khoảng
  // cách hình học thật giữa mọi lỗ liền kề bằng nhau, kể cả 2 lỗ nằm 2 bên
  // 1 góc.
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

/** Độ dày viền giấy trắng ngà bao quanh ảnh trước khi đục răng cưa. Giảm so
 * với bản trước (0.12 thay vì 0.15) — phản hồi thực tế cho thấy khoảng
 * cách từ khung viền tới răng cưa dày hơn cần thiết. Vẫn đủ chỗ cho 4 nhãn
 * chữ (hạng mục dọc trái, nhãn góc trên-phải, ngày góc dưới-trái, mệnh giá
 * góc dưới-phải) nhờ cỡ chữ cũng được thu nhỏ tương ứng (xem
 * decorateStampBorder). */
export function defaultBorderWidth(width: number, height: number): number {
  return Math.max(26, Math.round(Math.min(width, height) * 0.12));
}

// ---------------------------------------------------------------------
// Vân giấy in — rất nhẹ, KHÔNG có hiệu ứng "cũ/hoen ố" (tem thật là tem mới
// in, không phải đồ cổ) — chỉ đủ để dải màu không phẳng lì như vector.
// ---------------------------------------------------------------------

let noiseTileCache: HTMLCanvasElement | null = null;

function getNoiseTile(): HTMLCanvasElement {
  if (noiseTileCache) return noiseTileCache;
  const size = 96;
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d");
  if (ctx) {
    const imgData = ctx.createImageData(size, size);
    for (let i = 0; i < imgData.data.length; i += 4) {
      const v = 128 + (Math.random() - 0.5) * 40;
      imgData.data[i] = v;
      imgData.data[i + 1] = v;
      imgData.data[i + 2] = v;
      imgData.data[i + 3] = 255;
    }
    ctx.putImageData(imgData, 0, 0);
  }
  noiseTileCache = c;
  return c;
}

function paintPrintTexture(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const tile = getNoiseTile();
  const pattern = ctx.createPattern(tile, "repeat");
  if (!pattern) return;
  ctx.save();
  ctx.globalAlpha = 0.035;
  ctx.globalCompositeOperation = "multiply";
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

// ---------------------------------------------------------------------
// Khung — MỘT nét mảnh duy nhất sát mép ảnh, đúng cấu trúc tem thật (dải
// màu ngoài khung là trang trí thuần tuý, không có hoa văn hay nét phụ).
// ---------------------------------------------------------------------

function drawFrameRule(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  ink: string
) {
  ctx.save();
  ctx.strokeStyle = ink;
  ctx.globalAlpha = 0.85;
  ctx.lineWidth = Math.max(1, Math.min(w, h) * 0.006);
  ctx.strokeRect(x, y, w, h);
  ctx.restore();
}

// ---------------------------------------------------------------------
// Nhãn chữ — bố cục lấy đúng từ giải phẫu tem thật: chữ hạng mục chạy dọc
// theo mép trái (đọc từ dưới lên), nhãn ngắn góc trên-phải, mệnh giá góc
// dưới-phải. Đặt trong DẢI VIỀN MÀU quanh ảnh (không đè lên ảnh người dùng
// — khác với tem thương mại vốn được thiết kế sẵn khoảng trống cho chữ,
// ảnh chụp thật không có khoảng trống đó nên đè chữ lên sẽ che mất nội
// dung ảnh và khó đọc do nền ảnh không kiểm soát được).
//
// Canvas không có letter-spacing gốc nên các hàm dưới tự tính khoảng cách
// giữa từng ký tự và vẽ rời — cho hiệu ứng "chữ hoa dãn cách" đặc trưng của
// nhãn tem thay vì set-width mặc định của font.
// ---------------------------------------------------------------------

function drawVerticalLabel(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  cy: number,
  fontPx: number,
  ink: string
) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = ink;
  ctx.globalAlpha = 0.82;
  ctx.font = `600 ${fontPx}px "Helvetica Neue", Arial, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const spacing = fontPx * 0.22;
  const chars = Array.from(text);
  const widths = chars.map((ch) => ctx.measureText(ch).width);
  const total = widths.reduce((a, b) => a + b, 0) + spacing * (chars.length - 1);
  let x = -total / 2;
  for (let i = 0; i < chars.length; i++) {
    ctx.fillText(chars[i], x + widths[i] / 2, 0);
    x += widths[i] + spacing;
  }
  ctx.restore();
}

function drawLabelTag(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  fontPx: number,
  ink: string,
  align: "left" | "right"
) {
  ctx.save();
  ctx.fillStyle = ink;
  ctx.globalAlpha = 0.85;
  ctx.font = `700 ${fontPx}px "Helvetica Neue", Arial, sans-serif`;
  ctx.textBaseline = "alphabetic";

  const spacing = fontPx * 0.14;
  const chars = Array.from(text);
  const widths = chars.map((ch) => ctx.measureText(ch).width);
  const total = widths.reduce((a, b) => a + b, 0) + spacing * (chars.length - 1);
  const startX = align === "right" ? x - total : x;

  ctx.textAlign = "left";
  let cx = startX;
  for (let i = 0; i < chars.length; i++) {
    ctx.fillText(chars[i], cx, y);
    cx += widths[i] + spacing;
  }
  ctx.restore();
}

interface DenominationSpec {
  symbol: string;
  symbolPx: number;
  number: string;
  numPx: number;
  gap: number;
}

/** Mệnh giá góc dưới-phải kiểu "N. xx" — tiền tố nhỏ bằng serif thường +
 * số chính đậm lớn hơn, đúng tỉ lệ 2 cỡ chữ như "€ 0,41" trên tem thật. */
function drawDenomination(
  ctx: CanvasRenderingContext2D,
  value: DenominationSpec,
  x: number,
  y: number,
  ink: string,
  align: "left" | "right"
) {
  ctx.save();
  ctx.fillStyle = ink;
  ctx.globalAlpha = 0.9;
  ctx.textBaseline = "alphabetic";

  ctx.font = `400 ${value.symbolPx}px Georgia, serif`;
  const symbolW = ctx.measureText(value.symbol).width;
  ctx.font = `700 ${value.numPx}px Georgia, "Times New Roman", serif`;
  const numW = ctx.measureText(value.number).width;
  const total = symbolW + value.gap + numW;

  const startX = align === "right" ? x - total : x;
  ctx.textAlign = "left";
  ctx.font = `400 ${value.symbolPx}px Georgia, serif`;
  ctx.fillText(value.symbol, startX, y);
  ctx.font = `700 ${value.numPx}px Georgia, "Times New Roman", serif`;
  ctx.fillText(value.number, startX + symbolW + value.gap, y);
  ctx.restore();
}

/**
 * Bọc 1 khung viền giấy màu quanh ảnh — bước bắt buộc TRƯỚC khi gọi
 * applyStampMask(), để răng cưa cắt vào viền giấy chứ không cắt thẳng vào
 * nội dung ảnh. Trả về canvas MỚI lớn hơn ảnh gốc `borderWidth` mỗi bên.
 */
export function addStampBorder(
  photoCanvas: HTMLCanvasElement,
  borderWidth?: number,
  borderColor = "#f2e6cc"
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

  // Gộp tất cả các lỗ vào MỘT path rồi chỉ gọi fill() một lần duy nhất —
  // dưới composite mode "destination-out", mỗi lần fill() phải compositing
  // lại toàn bộ canvas, nên gọi riêng cho từng lỗ (hàng chục/hàng trăm lần)
  // sẽ rất chậm với canvas độ phân giải cao. Gộp path cho kết quả hình ảnh
  // y hệt nhưng chỉ tốn 1 lần compositing.
  ctx.beginPath();
  for (const p of points) {
    ctx.moveTo(p.x + r, p.y);
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
  }
  ctx.fill();

  ctx.globalCompositeOperation = "source-over";
  return out;
}

/**
 * Vẽ toàn bộ hoạ tiết + nhãn chữ lên viền giấy đã bo màu: vân giấy in nhẹ,
 * khung 1 nét sát mép ảnh, nhãn hạng mục chạy dọc mép trái, nhãn ngắn góc
 * trên-phải, ngày chụp góc dưới-trái, và mệnh giá "N. xx" góc dưới-phải.
 * Tách riêng khỏi buildStampPhoto() để dễ test/điều chỉnh từng phần mà
 * không đụng vào luồng bake chính.
 */
function decorateStampBorder(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  borderWidth: number,
  accent: StampAccent,
  seed: number,
  dateLabel: string,
  cornerLabel: string,
  categoryLabel: string
) {
  paintPrintTexture(ctx, width, height);

  const photoW = width - borderWidth * 2;
  const photoH = height - borderWidth * 2;
  // frameGap tính từ mép ảnh: đẩy khung ra xa ảnh hơn 1 chút (0.4 thay vì
  // 0.22) để phần dải màu NGOÀI khung (khoảng cách khung → răng cưa) hẹp
  // lại tương ứng — đây chính là phần người dùng phản hồi là "dày quá".
  const frameGap = borderWidth * 0.4;
  drawFrameRule(
    ctx,
    borderWidth - frameGap,
    borderWidth - frameGap,
    photoW + frameGap * 2,
    photoH + frameGap * 2,
    accent.ink
  );

  // Cỡ chữ nhãn thu nhỏ theo tỉ lệ (0.10 thay vì 0.13) để khớp với dải viền
  // giờ đã hẹp hơn — vẫn đủ lớn để đọc rõ, không bị tràn ra ngoài dải màu.
  drawVerticalLabel(ctx, categoryLabel, borderWidth * 0.42, height / 2, borderWidth * 0.1, accent.ink);
  drawLabelTag(ctx, cornerLabel, width - borderWidth * 0.42, borderWidth * 0.58, borderWidth * 0.1, accent.ink, "right");
  drawLabelTag(ctx, dateLabel, borderWidth * 0.42, height - borderWidth * 0.32, borderWidth * 0.1, accent.ink, "left");

  const value = 10 + (seed % 89);
  drawDenomination(
    ctx,
    {
      symbol: "N.",
      symbolPx: borderWidth * 0.16,
      number: String(value).padStart(2, "0"),
      numPx: borderWidth * 0.28,
      gap: borderWidth * 0.03,
    },
    width - borderWidth * 0.42,
    height - borderWidth * 0.3,
    accent.ink,
    "right"
  );
}

/** Định dạng ngày kiểu nhãn tem (dd · MM), dùng ngày hệ thống hiện tại của
 * thiết bị lúc bake ảnh. */
function formatStampDate(date: Date): string {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  return `${dd} · ${mm}`;
}

/**
 * Tiện ích gộp các bước: bọc viền giấy màu (lấy tông từ ảnh) + phủ vân giấy
 * + khung + nhãn chữ + mệnh giá + đục răng cưa — dùng trong
 * InstantCapture.tsx ngay sau khi chụp xong 1 khung hình.
 */
export function buildStampPhoto(
  photoCanvas: HTMLCanvasElement,
  options?: {
    borderWidth?: number;
    holeRadius?: number;
    borderColor?: string;
    seed?: number;
    date?: Date;
    cornerLabel?: string;
    categoryLabel?: string;
  }
): HTMLCanvasElement {
  const bw = options?.borderWidth ?? defaultBorderWidth(photoCanvas.width, photoCanvas.height);
  const accent = extractDominantAccent(photoCanvas);
  const bordered = addStampBorder(photoCanvas, bw, options?.borderColor ?? accent.border);
  const ctx = bordered.getContext("2d");
  const seed = options?.seed ?? Date.now();
  if (ctx) {
    decorateStampBorder(
      ctx,
      bordered.width,
      bordered.height,
      bw,
      accent,
      seed,
      formatStampDate(options?.date ?? new Date()),
      options?.cornerLabel ?? "INSTANT",
      options?.categoryLabel ?? "CANDID MOMENTS"
    );
  }
  return applyStampMask(bordered, options?.holeRadius ?? defaultHoleRadius(bordered.width, bordered.height));
}
