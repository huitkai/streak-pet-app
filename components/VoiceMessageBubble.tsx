"use client";

import { useEffect, useRef, useState } from "react";
import { PlayIcon, PauseIcon } from "@/components/icons";

function formatDuration(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** Chiều cao các vạch sóng — sinh giả ngẫu nhiên nhưng ỔN ĐỊNH theo url, để
 * mỗi tin thoại có 1 "vân sóng" riêng, không đổi giữa các lần render. */
function barsFor(seed: string, count: number) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const bars: number[] = [];
  for (let i = 0; i < count; i++) {
    h = (h * 1103515245 + 12345) >>> 0;
    bars.push(0.3 + (h % 100) / 140);
  }
  return bars;
}

export default function VoiceMessageBubble({
  url,
  duration,
  mine,
}: {
  url: string;
  duration: number;
  mine: boolean;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0); // 0..1
  const bars = barsFor(url, 26);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => setProgress(audio.duration ? audio.currentTime / audio.duration : 0);
    const onEnd = () => {
      setPlaying(false);
      setProgress(0);
    };
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("ended", onEnd);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("ended", onEnd);
    };
  }, []);

  function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.play();
      setPlaying(true);
    }
  }

  const activeBars = Math.round(progress * bars.length);

  return (
    <div
      className={`animate-bubble-in flex min-w-[190px] items-center gap-2 rounded-2xl px-3 py-2.5 shadow-sm ${
        mine ? "rounded-br-md bg-[var(--brand)] text-white" : "glass-surface rounded-bl-md text-[var(--foreground)]"
      }`}
    >
      <audio ref={audioRef} src={url} preload="metadata" className="hidden" />
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? "Tạm dừng" : "Phát"}
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full active:scale-95 ${
          mine ? "bg-white/20" : "bg-[var(--brand)] text-white"
        }`}
      >
        {playing ? <PauseIcon className="h-4 w-4" /> : <PlayIcon className="h-4 w-4" />}
      </button>

      <div className="flex flex-1 items-center gap-[2.5px]">
        {bars.map((h, i) => (
          <span
            key={i}
            className={`w-[2.5px] shrink-0 rounded-full ${
              i < activeBars ? (mine ? "bg-white" : "bg-[var(--brand)]") : mine ? "bg-white/40" : "bg-white/15"
            }`}
            style={{ height: `${h * 18}px` }}
          />
        ))}
      </div>

      <span className={`shrink-0 text-[11px] tabular-nums ${mine ? "text-white/85" : "text-[var(--muted)]"}`}>
        {formatDuration(duration)}
      </span>
    </div>
  );
}
