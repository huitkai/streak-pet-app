"use client";

/* eslint-disable @next/next/no-img-element */

const COLORS = ["#EC4F83", "#2E9BFF", "#8A3FFC", "#F0723A", "#5FBF8F", "#F6C445"];

function colorFor(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  return COLORS[Math.abs(hash) % COLORS.length];
}

export default function Avatar({
  url,
  name,
  size = 32,
  ring = false,
}: {
  url?: string | null;
  name?: string | null;
  size?: number;
  ring?: boolean;
}) {
  const label = (name?.trim()?.[0] ?? "?").toUpperCase();
  const bg = colorFor(name || "?");

  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-full ${
        ring ? "ring-2 ring-[var(--brand-light)]" : ""
      }`}
      style={{ width: size, height: size }}
    >
      {url ? (
        <img src={url} alt={name ?? "avatar"} className="h-full w-full object-cover" />
      ) : (
        <div
          className="flex h-full w-full items-center justify-center font-semibold text-white"
          style={{ background: bg, fontSize: size * 0.42 }}
        >
          {label}
        </div>
      )}
    </div>
  );
}
