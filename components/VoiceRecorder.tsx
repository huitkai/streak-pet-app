"use client";

import { useEffect, useRef, useState } from "react";
import { TrashIcon, SendIcon } from "@/components/icons";

function formatDuration(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function VoiceRecorder({
  onSend,
  onCancel,
}: {
  onSend: (blob: Blob, durationSec: number) => void;
  onCancel: () => void;
}) {
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const recorder = new MediaRecorder(stream);
        recorderRef.current = recorder;
        chunksRef.current = [];
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunksRef.current.push(e.data);
        };
        recorder.start();
        startedRef.current = true;
      } catch {
        setError("Không thể truy cập micro. Vui lòng cấp quyền cho trình duyệt.");
      }
    }
    start();

    const timer = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  function stopAndGet(): Promise<Blob | null> {
    return new Promise((resolve) => {
      const recorder = recorderRef.current;
      if (!recorder || recorder.state === "inactive") {
        resolve(null);
        return;
      }
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        resolve(blob);
      };
      recorder.stop();
    });
  }

  async function handleSend() {
    const blob = await stopAndGet();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    if (blob && seconds >= 1) onSend(blob, seconds);
    else onCancel();
  }

  async function handleCancel() {
    await stopAndGet();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    onCancel();
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 rounded-full bg-red-50 px-3.5 py-2 text-xs text-red-500">
        <span className="flex-1">{error}</span>
        <button type="button" onClick={onCancel} className="font-semibold">
          Đóng
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 items-center gap-2">
      <button
        type="button"
        onClick={handleCancel}
        aria-label="Huỷ ghi âm"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/5 text-[var(--muted)] active:scale-95"
      >
        <TrashIcon className="h-4.5 w-4.5" />
      </button>

      <div className="flex min-w-0 flex-1 items-center gap-2 rounded-full border border-[var(--border)] bg-[#fbf7f8] px-3.5 py-2">
        <span className="h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-red-500" />
        <div className="flex flex-1 items-center gap-[3px] overflow-hidden">
          {Array.from({ length: 24 }).map((_, i) => (
            <span
              key={i}
              className="animate-voice-bar h-3 w-[3px] shrink-0 rounded-full bg-[var(--brand)]/60"
              style={{ animationDelay: `${(i % 6) * 0.12}s` }}
            />
          ))}
        </div>
        <span className="shrink-0 text-xs font-medium tabular-nums text-[var(--muted)]">
          {formatDuration(seconds)}
        </span>
      </div>

      <button
        type="button"
        onClick={handleSend}
        aria-label="Gửi tin nhắn thoại"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--brand)] text-white active:scale-95"
      >
        <SendIcon className="h-4 w-4" />
      </button>
    </div>
  );
}
