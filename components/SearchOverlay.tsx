"use client";

import { useEffect, useRef, useState } from "react";
import { searchMessages } from "@/lib/actions";
import { formatMessageTime } from "@/lib/message-format";
import type { MessageRow } from "@/lib/types";
import { ArrowLeftIcon, SearchIcon, XIcon } from "@/components/icons";

export default function SearchOverlay({
  coupleId,
  onClose,
  onJump,
}: {
  coupleId: string;
  onClose: () => void;
  onJump: (message: MessageRow) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MessageRow[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    window.clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    debounceRef.current = window.setTimeout(async () => {
      const data = await searchMessages(coupleId, query.trim());
      setResults(data as MessageRow[]);
      setLoading(false);
    }, 300);
    return () => window.clearTimeout(debounceRef.current);
  }, [query, coupleId]);

  function highlight(text: string) {
    const q = query.trim();
    if (!q) return text;
    const idx = text.toLowerCase().indexOf(q.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <mark className="rounded bg-[var(--brand-light)] px-0.5 text-[var(--brand-dark)]">
          {text.slice(idx, idx + q.length)}
        </mark>
        {text.slice(idx + q.length)}
      </>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[var(--background)]">
      <div className="safe-top flex items-center gap-2 border-b border-[var(--border)] bg-[var(--surface)] px-2 py-2.5">
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng tìm kiếm"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full active:bg-black/5"
        >
          <ArrowLeftIcon className="h-5 w-5" />
        </button>
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-full bg-[#fbf7f8] px-3 py-2">
          <SearchIcon className="h-4 w-4 shrink-0 text-[var(--muted)]" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm trong cuộc trò chuyện..."
            className="min-w-0 flex-1 bg-transparent text-sm outline-none"
          />
          {query && (
            <button type="button" onClick={() => setQuery("")} aria-label="Xoá">
              <XIcon className="h-3.5 w-3.5 text-[var(--muted)]" />
            </button>
          )}
        </div>
      </div>

      <div className="thin-scroll flex-1 overflow-y-auto">
        {loading && <p className="mt-6 text-center text-xs text-[var(--muted)]">Đang tìm...</p>}
        {!loading && query.trim() && results.length === 0 && (
          <p className="mt-6 text-center text-xs text-[var(--muted)]">Không tìm thấy tin nhắn nào khớp.</p>
        )}
        {results.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => onJump(m)}
            className="flex w-full flex-col items-start gap-0.5 border-b border-[var(--border)] px-4 py-3 text-left active:bg-black/5"
          >
            <span className="text-[11px] text-[var(--muted)]">{formatMessageTime(m.created_at)}</span>
            <span className="line-clamp-2 text-sm text-[var(--foreground)]">{highlight(m.content)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
