"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { PetRow, StreakRow } from "@/lib/types";
import { STAGE_LABEL, nextStageThreshold, stageProgress } from "@/lib/pets";
import { MOOD_LABEL } from "@/lib/pet-logic";
import type { PetSpecies } from "@/lib/pets";
import PetAvatar from "@/components/PetAvatar";
import { SparkleIcon } from "@/components/icons";

export default function PetDisplay({
  coupleId,
  initialPet,
  petName,
  species,
  currentStreak,
}: {
  coupleId: string;
  initialPet: PetRow;
  petName: string;
  species: PetSpecies;
  currentStreak: number;
}) {
  const [pet, setPet] = useState(initialPet);
  const [streak, setStreak] = useState(currentStreak);

  useEffect(() => {
    const supabase = createClient();
    const petChannel = supabase
      .channel(`pet-${coupleId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "pets", filter: `couple_id=eq.${coupleId}` },
        (payload) => setPet(payload.new as PetRow)
      )
      .subscribe();

    const streakChannel = supabase
      .channel(`pet-streak-${coupleId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "streaks", filter: `couple_id=eq.${coupleId}` },
        (payload) => setStreak((payload.new as StreakRow).current_streak)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(petChannel);
      supabase.removeChannel(streakChannel);
    };
  }, [coupleId]);

  const next = nextStageThreshold(streak);
  const progress = stageProgress(streak);

  return (
    <div className="flex flex-col items-center rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
      <div className="animate-float-slow">
        <PetAvatar species={species} stage={pet.stage} mood={pet.mood} size={112} />
      </div>
      <p className="mt-2 font-semibold text-[var(--foreground)]">{petName}</p>
      <p className="text-xs text-[var(--muted)]">
        {STAGE_LABEL[pet.stage]} · {MOOD_LABEL[pet.mood]}
      </p>

      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[var(--brand-light)]">
        <div
          className="h-full rounded-full bg-[var(--brand)] transition-all duration-700"
          style={{ width: `${Math.round(progress * 100)}%` }}
        />
      </div>
      {next ? (
        <p className="mt-1 text-[11px] text-[var(--muted)]">
          Còn {next - streak} ngày để tiến hóa
        </p>
      ) : (
        <p className="mt-1 flex items-center gap-1 text-[11px] text-[var(--muted)]">
          <SparkleIcon className="h-3 w-3" /> Đã đạt giai đoạn cao nhất
        </p>
      )}
    </div>
  );
}
