/**
 * Khung "tem bưu chính" (perforated stamp edge) cho tính năng Chụp nhanh.
 *
 * BẢN THIẾT KẾ LẠI (v2) — tham khảo trực tiếp 1 tấm ảnh sưu tập tem cổ thật
 * (hoa lá, tiên nữ, nấm... in trên nền màu pastel, có số hiệu góc, dấu mộc
 * bưu điện, khung viền kép). So với bản cũ, 3 điểm được nâng cấp:
 *
 *  1. CHẤT GIẤY: trước đây viền chỉ là 1 màu phẳng tuyệt đối — giờ có thêm
 *     vân giấy (paint noise tile hoà trộn multiply), vài đốm "hoen ố" mờ
 *     (foxing, đặc trưng giấy cũ) và 1 lớp vignette rất nhẹ, nên nhìn có
 *     chiều sâu như giấy thật thay vì nền vector phẳng lì.
 *  2. MÀU SẮC THEO ẢNH: trước đây lấy trung bình cộng RGB toàn ảnh — với
 *     ảnh có nhiều vùng màu khác nhau (áo đỏ + tường xanh + da người...),
 *     phép cộng trung bình khiến các hue đối lập triệt tiêu nhau và luôn ra
 *     1 màu nâu xám nhờ nhờ bất kể ảnh gốc là màu gì. Giờ dùng histogram
 *     theo hue (xem extractDominantAccent) để tìm đúng tông màu THỰC SỰ
 *     chiếm ưu thế, giống cách mắt người nhận diện "ảnh này tông xanh lá"
 *     hay "tông cam hoàng hôn".
 *  3. KÝ TỰ/HOA VĂN: thêm khung viền kép (2 nét chỉ mảnh) với hoa văn hình
 *     thoi ở 4 góc, số hiệu kiểu "Nº xx" bằng font serif italic (giống số
 *     mệnh giá tem), và dấu mộc bưu điện tròn có chữ chạy theo cung tròn +
 *     vạch huỷ tem — thay cho số + vòng tròn đơn giản của bản cũ.
 *
 * ---- Cấu trúc 2 lớp giữ nguyên như bản gốc ----
 *  1. Một viền giấy màu (giờ có vân + hoa văn) bao quanh ảnh (addStampBorder)
 *     — răng cưa được cắt vào LỚP VIỀN NÀY, không đụng vào nội dung ảnh.
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
   * giữ độ sáng cao + bão hoà vừa phải để đọc như giấy tem chứ không thành
   * 1 mảng màu phẳng chói mắt. */
  border: string;
  /** Màu "mực" đậm cùng tông, dùng để in số hiệu, hoa văn khung + dấu mộc —
   * tương phản đủ để đọc được trên nền viền nhạt. */
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
 * 6px) toàn bộ canvas — thay cho cách cũ (cộng trung bình RGB) vì ảnh thật
 * hầu như luôn có nhiều vùng màu khác nhau cùng lúc (áo, da, nền...); cộng
 * trung bình trực tiếp khiến các hue đối lập triệt tiêu nhau và kết quả gần
 * như luôn ra 1 màu nâu xám bất kể ảnh gốc.
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

  // Viền giấy: chỉ pha 20% về hue kem cố định để giữ chất "giấy cổ", 80%
  // còn lại giữ đúng hue chủ đạo của ảnh — trước đây pha ngược lại (70%
  // kem/30% ảnh) nên viền gần như luôn ra cùng 1 màu nâu nhạt bất kể ảnh.
  const borderHue = hasColor ? CREAM_HUE * 0.2 + domHue * 0.8 : CREAM_HUE;
  const borderSat = hasColor ? Math.min(0.5, Math.max(0.24, domSat * 0.85)) : 0.13;
  const borderLight = hasColor ? Math.min(0.91, Math.max(0.82, domLight * 0.35 + 0.65)) : 0.93;
  const border = hslToCss(borderHue, borderSat, borderLight);

  // Mực: cùng hue, tăng bão hoà + hạ độ sáng để tương phản, đọc rõ số hiệu
  // và hoa văn khung trên nền viền nhạt.
  const inkSat = hasColor ? Math.max(0.38, domSat) : 0.16;
  const ink = hslToCss(domHue, inkSat, 0.26);

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
 * và phần "thịt" giấy quanh mỗi lỗ đủ dày, nhìn mềm mại thay vì mỏng dính.
 * Cũng cần đủ rộng để chứa khung hoa văn kép + số hiệu + dấu mộc mới. */
export function defaultBorderWidth(width: number, height: number): number {
  return Math.max(26, Math.round(Math.min(width, height) * 0.13));
}

// ---------------------------------------------------------------------
// Chất giấy: vân giấy + đốm hoen ố + vignette nhẹ
// ---------------------------------------------------------------------

let noiseTileCache: HTMLCanvasElement | null = null;

/** 1 tile nhiễu xám nhỏ (96x96), dùng làm pattern lặp lại để mô phỏng vân
 * sợi giấy. Cache lại vì tile giống hệt nhau dùng được cho mọi tấm ảnh —
 * không cần sinh nhiễu mới mỗi lần chụp. */
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
      const v = 128 + (Math.random() - 0.5) * 60;
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

/** RNG tuyến tính đơn giản (LCG) — chỉ cần đủ "trông ngẫu nhiên", không cần
 * chất lượng mật mã. Dùng seed cố định theo từng ảnh để các đốm hoen ố nằm
 * ở vị trí ổn định nếu render lại cùng 1 ảnh, thay vì nhảy lung tung mỗi
 * lần vẽ. */
function makeSeededRandom(seed: number): () => number {
  let state = seed >>> 0 || 1;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

/**
 * Vẽ chất liệu giấy lên TOÀN BỘ khung viền: vân sợi giấy (noise pattern hoà
 * multiply, rất nhẹ), vài đốm "hoen ố" mờ đặc trưng giấy cũ, và 1 lớp
 * vignette nhẹ hướng ra mép ngoài để tấm ảnh có chiều sâu vật lý thay vì
 * nhìn phẳng lì như 1 hình chữ nhật vector tô màu.
 */
function paintPaperTexture(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  ink: string,
  seed: number
) {
  ctx.save();
  const tile = getNoiseTile();
  const pattern = ctx.createPattern(tile, "repeat");
  if (pattern) {
    ctx.globalAlpha = 0.05;
    ctx.globalCompositeOperation = "multiply";
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, width, height);
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
  }
  ctx.restore();

  const rand = makeSeededRandom(seed);
  const spotCount = 5;
  for (let i = 0; i < spotCount; i++) {
    const x = rand() * width;
    const y = rand() * height;
    const r = (0.06 + rand() * 0.1) * Math.min(width, height);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, ink);
    g.addColorStop(1, "transparent");
    ctx.save();
    ctx.globalAlpha = 0.035 + rand() * 0.02;
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  const vign = ctx.createRadialGradient(
    width / 2, height / 2, Math.min(width, height) * 0.35,
    width / 2, height / 2, Math.max(width, height) * 0.72
  );
  vign.addColorStop(0, "rgba(0,0,0,0)");
  vign.addColorStop(1, ink);
  ctx.save();
  ctx.globalAlpha = 0.05;
  ctx.fillStyle = vign;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

// ---------------------------------------------------------------------
// Khung hoa văn kép + hoạ tiết hình thoi góc (gợi nhớ khung chạm khắc tem)
// ---------------------------------------------------------------------

function drawOrnateFrame(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  borderWidth: number,
  ink: string
) {
  const outerInset = borderWidth * 0.42;
  const innerInset = borderWidth * 0.58;

  ctx.save();
  ctx.strokeStyle = ink;
  ctx.globalAlpha = 0.55;
  ctx.lineWidth = Math.max(1, borderWidth * 0.028);
  ctx.strokeRect(outerInset, outerInset, width - outerInset * 2, height - outerInset * 2);

  ctx.globalAlpha = 0.4;
  ctx.lineWidth = Math.max(1, borderWidth * 0.02);
  ctx.strokeRect(innerInset, innerInset, width - innerInset * 2, height - innerInset * 2);
  ctx.restore();

  // Hoạ tiết hình thoi nhỏ tại 4 góc của nét trong — giống hoa văn chạm góc
  // thường thấy trên khung tem khắc cổ điển.
  const d = borderWidth * 0.16;
  const corners: Point[] = [
    { x: innerInset, y: innerInset },
    { x: width - innerInset, y: innerInset },
    { x: innerInset, y: height - innerInset },
    { x: width - innerInset, y: height - innerInset },
  ];
  ctx.save();
  ctx.fillStyle = ink;
  ctx.globalAlpha = 0.6;
  for (const { x: cx, y: cy } of corners) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-d / 2, -d / 2, d, d);
    ctx.restore();
  }
  ctx.restore();
}

// ---------------------------------------------------------------------
// Chữ chạy theo cung tròn — dùng cho dấu mộc bưu điện
// ---------------------------------------------------------------------

/**
 * Vẽ `text` chạy dọc theo 1 cung tròn tâm (cx, cy) bán kính `radius`.
 * `centerAngle` là góc (radian, 0 = hướng 12 giờ, tăng dần theo chiều kim
 * đồng hồ) tại điểm giữa của dòng chữ.
 *
 * `upright=true` dùng cho chữ nằm ở NỬA DƯỚI vòng tròn (quanh centerAngle=π):
 * nếu không xử lý, chữ ở nửa dưới sẽ bị lộn ngược (vì xoay theo đúng góc cực
 * tại đó ~180°). Cách sửa: đi ngược chiều (dir=-1) và xoay thêm π cho mỗi
 * ký tự — kết quả là chữ vẫn đọc xuôi trái sang phải, không bị úp ngược.
 */
function drawArcText(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  cy: number,
  radius: number,
  centerAngle: number,
  opts: { color: string; fontPx: number; upright?: boolean; spacing?: number }
) {
  const { color, fontPx, upright = false, spacing = 0.05 } = opts;
  ctx.save();
  ctx.fillStyle = color;
  ctx.font = `600 ${fontPx}px Georgia, "Times New Roman", serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const dir = upright ? -1 : 1;
  const rotAdj = upright ? Math.PI : 0;
  const chars = Array.from(text);
  const angles = chars.map((ch) => ctx.measureText(ch).width / radius + spacing);
  const total = angles.reduce((a, b) => a + b, 0);

  let a = centerAngle - dir * total / 2;
  for (let i = 0; i < chars.length; i++) {
    const half = angles[i] / 2;
    const mid = a + dir * half;
    const x = cx + radius * Math.sin(mid);
    const y = cy - radius * Math.cos(mid);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(mid + rotAdj);
    ctx.fillText(chars[i], 0, 0);
    ctx.restore();
    a += dir * angles[i];
  }
  ctx.restore();
}

/**
 * Dấu mộc bưu điện: 2 vòng tròn đồng tâm, chữ chạy theo cung trên + cung
 * dưới (mặc định: nhãn cố định ở trên, ngày chụp ở dưới), 1 ngôi sao nhỏ ở
 * vị trí 3 giờ/9 giờ ngăn cách 2 dòng chữ, và vài vạch huỷ tem xiên qua tâm
 * — mô phỏng đúng cấu trúc dấu mộc bưu điện thật (địa danh + ngày + vạch
 * huỷ) thay vì 1 vòng tròn chấm chấm đơn giản như bản cũ.
 */
function drawPostmark(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  ink: string,
  topLabel: string,
  bottomLabel: string
) {
  ctx.save();
  ctx.strokeStyle = ink;
  ctx.globalAlpha = 0.7;
  ctx.lineWidth = Math.max(1, r * 0.045);
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.74, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  drawArcText(ctx, topLabel, cx, cy, r * 0.87, 0, { color: ink, fontPx: r * 0.26 });
  drawArcText(ctx, bottomLabel, cx, cy, r * 0.87, Math.PI, { color: ink, fontPx: r * 0.24, upright: true });

  ctx.save();
  ctx.fillStyle = ink;
  ctx.globalAlpha = 0.7;
  for (const ang of [Math.PI / 2, -Math.PI / 2]) {
    const x = cx + r * 0.87 * Math.sin(ang);
    const y = cy - r * 0.87 * Math.cos(ang);
    ctx.beginPath();
    const spikes = 4, outerR = r * 0.07, innerR = r * 0.03;
    for (let i = 0; i < spikes * 2; i++) {
      const rad = i % 2 === 0 ? outerR : innerR;
      const a2 = (Math.PI / spikes) * i - Math.PI / 2;
      const px = x + rad * Math.cos(a2), py = y + rad * Math.sin(a2);
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // Vạch huỷ tem xiên qua tâm, giống dấu mộc thật đóng đè lên tem đã dùng.
  ctx.save();
  ctx.strokeStyle = ink;
  ctx.globalAlpha = 0.22;
  ctx.lineWidth = Math.max(1, r * 0.035);
  for (const ang of [-0.35, -0.1, 0.15, 0.4]) {
    ctx.beginPath();
    ctx.moveTo(cx - r * 1.15 * Math.cos(ang), cy - r * 1.15 * Math.sin(ang));
    ctx.lineTo(cx + r * 1.15 * Math.cos(ang), cy + r * 1.15 * Math.sin(ang));
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * Số hiệu góc trên-trái kiểu "Nº xx" — tiền tố "Nº" bằng serif in nghiêng
 * nhỏ phía trên, số chính bằng serif đậm lớn hơn phía dưới, cùng 3 chấm hoa
 * văn ngay dưới số (giống các gạch chấm trang trí dưới mệnh giá tem cổ).
 * Đẹp và có "ký tự" rõ ràng hơn hẳn 1 con số trần trụi của bản cũ.
 */
function drawCornerNumeral(
  ctx: CanvasRenderingContext2D,
  borderWidth: number,
  ink: string,
  seed: number
) {
  const inset = borderWidth * 0.52;
  const value = String(10 + (seed % 89)).padStart(2, "0");

  ctx.save();
  ctx.fillStyle = ink;
  ctx.globalAlpha = 0.92;
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";

  const prefixPx = borderWidth * 0.26;
  const numPx = borderWidth * 0.6;
  ctx.font = `italic 500 ${prefixPx}px Georgia, serif`;
  ctx.fillText("Nº", inset * 0.62, inset * 0.62 + prefixPx * 0.4);

  ctx.font = `700 ${numPx}px Georgia, "Times New Roman", serif`;
  ctx.fillText(value, inset * 0.62, inset * 0.62 + prefixPx * 0.5 + numPx * 0.86);

  const dotY = inset * 0.62 + prefixPx * 0.5 + numPx * 0.86 + numPx * 0.14;
  const dotR = numPx * 0.045;
  for (const dx of [-0.14, 0, 0.14]) {
    ctx.beginPath();
    ctx.arc(inset * 0.62 + numPx * 0.55 + dx * numPx, dotY, dotR, 0, Math.PI * 2);
    ctx.fill();
  }
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
 * Vẽ toàn bộ hoạ tiết trang trí lên viền giấy đã bo màu: chất giấy (vân +
 * hoen ố + vignette), khung hoa văn kép, số hiệu góc "Nº xx", và dấu mộc
 * bưu điện tròn ở góc dưới-phải. Tách riêng khỏi buildStampPhoto() để dễ
 * test/điều chỉnh từng phần mà không đụng vào luồng bake chính.
 */
function decorateStampBorder(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  borderWidth: number,
  accent: StampAccent,
  seed: number,
  dateLabel: string
) {
  paintPaperTexture(ctx, width, height, accent.ink, seed);
  drawOrnateFrame(ctx, width, height, borderWidth, accent.ink);
  drawCornerNumeral(ctx, borderWidth, accent.ink, seed);

  const r = borderWidth * 0.42;
  const cx = width - borderWidth * 0.62;
  const cy = height - borderWidth * 0.62;
  drawPostmark(ctx, cx, cy, r, accent.ink, "KHOẢNH KHẮC", dateLabel);
}

/** Định dạng ngày kiểu dấu mộc bưu điện (dd · MM), dùng ngày hệ thống hiện
 * tại của thiết bị lúc bake ảnh — đúng như con tem thật luôn đóng dấu ngày
 * gửi thư. */
function formatPostmarkDate(date: Date): string {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  return `${dd} · ${mm}`;
}

/**
 * Tiện ích gộp các bước: bọc viền giấy màu (lấy tông từ ảnh) + phủ chất
 * giấy + khung hoa văn + số hiệu + dấu mộc + đục răng cưa — dùng trong
 * InstantCapture.tsx ngay sau khi chụp xong 1 khung hình.
 */
export function buildStampPhoto(
  photoCanvas: HTMLCanvasElement,
  options?: { borderWidth?: number; holeRadius?: number; borderColor?: string; seed?: number; date?: Date }
): HTMLCanvasElement {
  const bw = options?.borderWidth ?? defaultBorderWidth(photoCanvas.width, photoCanvas.height);
  const accent = extractDominantAccent(photoCanvas);
  const bordered = addStampBorder(photoCanvas, bw, options?.borderColor ?? accent.border);
  const ctx = bordered.getContext("2d");
  const seed = options?.seed ?? Date.now();
  if (ctx) {
    decorateStampBorder(ctx, bordered.width, bordered.height, bw, accent, seed, formatPostmarkDate(options?.date ?? new Date()));
  }
  return applyStampMask(bordered, options?.holeRadius ?? defaultHoleRadius(bordered.width, bordered.height));
}
