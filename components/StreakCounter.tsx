"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { StreakRow } from "@/lib/types";
import { nextStageThreshold } from "@/lib/pets";
import { FlameIcon, CheckIcon, TrophyIcon } from "@/components/icons";

export default function StreakCounter({
  coupleId,
  initialStreak,
}: {
  coupleId: string;
  initialStreak: StreakRow;
}) {
  const [streak, setStreak] = useState(initialStreak);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`streak-${coupleId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "streaks",
          filter: `couple_id=eq.${coupleId}`,
        },
        (payload) => setStreak(payload.new as StreakRow)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [coupleId]);

  const next = nextStageThreshold(streak.current_streak);
  const bothSentToday = streak.user1_sent_today && streak.user2_sent_today;

  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
      <div className={`text-orange-500 ${streak.current_streak > 0 ? "animate-flame" : ""}`}>
        <FlameIcon className="h-9 w-9" strokeWidth={1.6} />
      </div>
      <div className="mt-1 text-2xl font-bold text-[var(--foreground)]">{streak.current_streak}</div>
      <p className="flex items-center gap-1 text-[11px] text-[var(--muted)]">
        <TrophyIcon className="h-3.5 w-3.5" /> Kỷ lục {streak.longest_streak} ngày
      </p>

      <p
        className={`mt-2 flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${
          bothSentToday ? "bg-green-50 text-green-600" : "bg-[var(--brand-light)] text-[var(--brand-dark)]"
        }`}
      >
        {bothSentToday && <CheckIcon className="h-3 w-3" />}
        {bothSentToday ? "Hôm nay đã giữ chuỗi" : "Nhắn tin hôm nay để giữ chuỗi"}
      </p>

      {next && (
        <p className="mt-1 text-[11px] text-[var(--muted)]">
          Còn {next - streak.current_streak} ngày để tiến hóa tiếp
        </p>
      )}
    </div>
  );
}
