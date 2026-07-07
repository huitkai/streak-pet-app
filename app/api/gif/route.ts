import { NextRequest, NextResponse } from "next/server";

/**
 * Proxy tìm/gợi ý GIF qua Tenor API v2 — chạy ở server để KHÔNG lộ
 * `TENOR_API_KEY` ra client (đúng yêu cầu mục 6 trong kế hoạch: "cần API key
 * phía server — proxy qua 1 route handler để không lộ key ra client").
 *
 * Dùng Tenor thay vì GIPHY vì Tenor có free tier không cần thẻ tín dụng và
 * SDK-less (chỉ cần gọi REST), phù hợp với 1 app nhỏ 2 người dùng.
 *
 * GET /api/gif?q=hug          -> tìm theo từ khoá
 * GET /api/gif                -> xu hướng (trending)
 *
 * Trả về mảng rút gọn { id, url, previewUrl, width, height } — client không
 * cần biết cấu trúc response gốc (khá cồng kềnh) của Tenor.
 */

interface TenorMediaFormat {
  url: string;
  dims: [number, number];
}

interface TenorResult {
  id: string;
  media_formats: Record<string, TenorMediaFormat>;
}

const TENOR_BASE = "https://tenor.googleapis.com/v2";

export async function GET(req: NextRequest) {
  const apiKey = process.env.TENOR_API_KEY;
  if (!apiKey) {
    // Chưa cấu hình key — trả lỗi rõ ràng để UI hiện hướng dẫn thay vì lỗi
    // mạng khó hiểu. Xem README/.env.example để biết cách thêm key.
    return NextResponse.json(
      { error: "missing_api_key", message: "Chưa cấu hình TENOR_API_KEY trên server." },
      { status: 501 }
    );
  }

  const q = req.nextUrl.searchParams.get("q")?.trim();
  const endpoint = q ? "search" : "featured"; // "featured" = trending của Tenor
  const params = new URLSearchParams({
    key: apiKey,
    client_key: "streak-pet-app",
    limit: "24",
    media_filter: "tinygif,gif",
    contentfilter: "medium",
    locale: "vi_VN",
  });
  if (q) params.set("q", q);

  try {
    const res = await fetch(`${TENOR_BASE}/${endpoint}?${params.toString()}`, {
      // Cache ngắn phía edge/CDN cho trending — đỡ tốn quota API khi nhiều
      // người mở tab GIF liên tục trong vài phút.
      next: { revalidate: q ? 0 : 120 },
    });
    if (!res.ok) {
      return NextResponse.json({ error: "tenor_error", message: `Tenor trả lỗi ${res.status}` }, { status: 502 });
    }
    const data = (await res.json()) as { results?: TenorResult[] };
    const results = (data.results ?? []).map((r) => {
      const full = r.media_formats.gif ?? r.media_formats.tinygif;
      const preview = r.media_formats.tinygif ?? full;
      return {
        id: r.id,
        url: full?.url ?? "",
        previewUrl: preview?.url ?? full?.url ?? "",
        width: full?.dims?.[0],
        height: full?.dims?.[1],
      };
    }).filter((r) => r.url);
    return NextResponse.json({ results });
  } catch (err) {
    console.error("Tenor proxy fetch failed", err);
    return NextResponse.json({ error: "network_error", message: "Không gọi được Tenor." }, { status: 502 });
  }
}
