"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { STICKER_IDS, STICKER_LABEL, StickerArt, type StickerId } from "@/components/Stickers";
import EmojiFullPicker from "@/components/EmojiFullPicker";
import { XIcon, SearchIcon } from "@/components/icons";

type Tab = "sticker" | "emoji" | "gif";

type GifResult = { id: string; url: string; previewUrl: string; width?: number; height?: number };

/**
 * Bộ chọn "Nhãn dán" mở rộng theo mục 6 kế hoạch: 3 tab —
 *  - "Sticker": kho sticker vẽ tay có sẵn (giữ nguyên, không đổi).
 *  - "Emoji": EmojiFullPicker đầy đủ, chèn thẳng vào ô nhập text.
 *  - "GIF": tìm/xu hướng GIF qua Tenor (proxy server, xem app/api/gif/route.ts).
 */
export default function StickerPicker({
  onSelectSticker,
  onSelectEmoji,
  onSelectGif,
  onClose,
}: {
  onSelectSticker: (id: StickerId) => void;
  onSelectEmoji: (emoji: string) => void;
  onSelectGif: (url: string, width?: number, height?: number) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<Tab>("sticker");

  return (
    <div className="absolute inset-x-0 bottom-full z-20 mb-2">
      <div className="animate-sheet-up mx-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3 shadow-xl">
        <div className="mb-2 flex items-center justify-between px-1">
          <div className="flex gap-1 rounded-full bg-black/5 p-0.5">
            {(
              [
                { key: "sticker", label: "Sticker" },
                { key: "emoji", label: "Emoji" },
                { key: "gif", label: "GIF" },
              ] as { key: Tab; label: string }[]
            ).map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                  tab === t.key ? "bg-[var(--surface)] text-[var(--brand-dark)] shadow-sm" : "text-[var(--muted)]"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <button onClick={onClose} className="rounded-full p-1 text-[var(--muted)] hover:bg-black/5" aria-label="Đóng">
            <XIcon className="h-4 w-4" />
          </button>
        </div>

        {tab === "sticker" && (
          <div className="grid max-h-64 grid-cols-4 gap-2 overflow-y-auto thin-scroll">
            {STICKER_IDS.map((id) => (
              <button
                key={id}
                onClick={() => onSelectSticker(id)}
                className="flex flex-col items-center gap-1 rounded-xl p-2 transition active:scale-90 hover:bg-[var(--brand-light)]"
              >
                <StickerArt id={id} className="h-12 w-12" />
                <span className="text-[10px] text-[var(--muted)]">{STICKER_LABEL[id]}</span>
              </button>
            ))}
          </div>
        )}

        {tab === "emoji" && (
          <EmojiFullPicker title="Tìm emoji" onSelect={onSelectEmoji} onClose={onClose} />
        )}

        {tab === "gif" && <GifTab onSelect={onSelectGif} />}
      </div>
    </div>
  );
}

/**
 * Tab GIF: gọi /api/gif (proxy Tenor). Mặc định hiện xu hướng (không có
 * `q`), gõ vào ô tìm kiếm sẽ debounce rồi gọi lại với `q`. Nếu server báo
 * chưa cấu hình `TENOR_API_KEY`, hiện hướng dẫn thay vì lỗi mạng khó hiểu.
 */
function GifTab({ onSelect }: { onSelect: (url: string, width?: number, height?: number) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GifResult[] | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error" | "missing_key">("loading");
  const debounceRef = useRef<number | undefined>(undefined);

  const fetchGifs = useCallback(async (q: string) => {
    setStatus("loading");
    try {
      const params = q ? `?q=${encodeURIComponent(q)}` : "";
      const res = await fetch(`/api/gif${params}`);
      const data = await res.json();
      if (res.status === 501 && data?.error === "missing_api_key") {
        setStatus("missing_key");
        setResults([]);
        return;
      }
      if (!res.ok) {
        setStatus("error");
        setResults([]);
        return;
      }
      setResults(data.results ?? []);
      setStatus("ready");
    } catch {
      setStatus("error");
      setResults([]);
    }
  }, []);

  useEffect(() => {
    window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(
      () => {
        void fetchGifs(query);
      },
      query ? 350 : 0
    );
    return () => window.clearTimeout(debounceRef.current);
  }, [query, fetchGifs]);

  return (
    <div className="flex max-h-64 flex-col">
      <div className="relative mb-2 shrink-0 px-0.5">
        <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--muted)]" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm GIF..."
          aria-label="Tìm GIF"
          className="w-full rounded-full bg-black/5 py-1.5 pl-8 pr-3 text-[13px] outline-none placeholder:text-[var(--muted)]"
        />
      </div>

      {status === "missing_key" && (
        <p className="px-2 py-6 text-center text-xs text-[var(--muted)]">
          Tab GIF chưa hoạt động vì server chưa cấu hình <code>TENOR_API_KEY</code>. Xem{" "}
          <code>.env.example</code> để biết cách thêm key (miễn phí tại tenor.com/gifapi).
        </p>
      )}
      {status === "error" && (
        <p className="px-2 py-6 text-center text-xs text-[var(--muted)]">
          Không tải được GIF lúc này, thử lại sau nhé.
        </p>
      )}
      {status === "loading" && (
        <p className="px-2 py-6 text-center text-xs text-[var(--muted)]">Đang tải...</p>
      )}
      {status === "ready" && results && results.length === 0 && (
        <p className="px-2 py-6 text-center text-xs text-[var(--muted)]">Không tìm thấy GIF nào.</p>
      )}
      {status === "ready" && results && results.length > 0 && (
        <div className="grid grid-cols-3 gap-1.5 overflow-y-auto thin-scroll">
          {results.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => onSelect(g.url, g.width, g.height)}
              className="aspect-square overflow-hidden rounded-lg bg-black/5 transition active:scale-95"
            >
              {/* GIF động, kích thước không cố định trước — img thường phù hợp
                  hơn next/image ở đây, và ảnh nhỏ (tinygif) nên không cần lazy
                  library riêng, chỉ cần loading="lazy" chuẩn của trình duyệt. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={g.previewUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
