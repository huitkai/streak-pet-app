"use client";

import { useState, useTransition } from "react";
import PetAvatar from "@/components/PetAvatar";
import FlameBadge from "@/components/FlameBadge";
import { getFlameTier, getAllFlameTiers } from "@/lib/streak-visual";
import {
  STAGE_LABEL,
  nextStageThreshold,
  stageProgress,
  VARIANT_LABEL,
  VARIANT_DESC,
  ACCESSORY_LIST,
  ACCESSORY_LABEL,
  isAccessoryUnlocked,
  accessoryUnlockStreak,
  isAccessorySeasonal,
} from "@/lib/pets";
import { MOOD_LABEL } from "@/lib/pet-logic";
import { setPetAccessory } from "@/lib/actions";
import { TrophyIcon, CheckIcon, XIcon, LockIcon } from "@/components/icons";
import type { PetRow, StreakRow } from "@/lib/types";
import type { PetSpecies, PetVariant, PetAccessory } from "@/lib/pets";

export default function PetSheet({
  coupleId,
  petName,
  species,
  variant,
  accessory,
  pet,
  streak,
  onClose,
}: {
  coupleId: string;
  petName: string;
  species: PetSpecies;
  variant: PetVariant;
  accessory: PetAccessory;
  pet: PetRow;
  streak: StreakRow;
  onClose: () => void;
}) {
  const tier = getFlameTier(streak.current_streak);
  const next = nextStageThreshold(streak.current_streak);
  const progress = stageProgress(streak.current_streak);
  const bothSentToday = streak.user1_sent_today && streak.user2_sent_today;

  const [localAccessory, setLocalAccessory] = useState(accessory);
  const [accessoryError, setAccessoryError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function handlePickAccessory(id: PetAccessory) {
    if (id === localAccessory) return;
    if (!isAccessoryUnlocked(id, streak.current_streak)) return;
    const prev = localAccessory;
    setLocalAccessory(id); // optimistic
    setAccessoryError(null);
    startTransition(async () => {
      const res = await setPetAccessory(coupleId, id);
      if (res?.error) {
        setLocalAccessory(prev);
        setAccessoryError(res.error);
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div
        className="absolute inset-0 bg-black/35 animate-pop-in"
        onClick={onClose}
        aria-hidden
      />
      <div className="safe-bottom animate-sheet-up relative w-full max-w-md rounded-t-3xl bg-[var(--surface)] p-5 shadow-xl max-h-[88vh] overflow-y-auto">
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng"
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-black/5 text-[var(--muted)]"
        >
          <XIcon className="h-4 w-4" />
        </button>

        <div className="flex flex-col items-center pt-2">
          <div className="animate-float-slow">
            <PetAvatar
              species={species}
              stage={pet.stage}
              mood={pet.mood}
              variant={variant}
              accessory={localAccessory}
              size={128}
              excited={tier.special}
            />
          </div>
          <p className="mt-2 text-lg font-bold text-[var(--foreground)]">{petName}</p>
          <p className="text-xs text-[var(--muted)]">
            {STAGE_LABEL[pet.stage]} · {MOOD_LABEL[pet.mood]}
          </p>
          {pet.stage !== "egg" && (
            <p className="mt-0.5 text-[11px] font-medium text-[var(--brand-dark)]">
              {VARIANT_LABEL[variant]} · {VARIANT_DESC[variant]}
            </p>
          )}

          <div className="mt-3 h-1.5 w-full max-w-[220px] overflow-hidden rounded-full bg-[var(--brand-light)]">
            <div
              className="h-full rounded-full bg-[var(--brand)] transition-all duration-700"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
          {next ? (
            <p className="mt-1 text-[11px] text-[var(--muted)]">
              Còn {next - streak.current_streak} ngày để tiến hóa tiếp
            </p>
          ) : (
            <p className="mt-1 text-[11px] text-[var(--muted)]">Đã đạt giai đoạn cao nhất 🎉</p>
          )}
        </div>

        <div className="mt-5 flex flex-col items-center rounded-2xl bg-[#fbf7f8] p-4">
          <FlameBadge streak={streak.current_streak} size="lg" />
          <p className="mt-1 text-xs font-medium text-[var(--muted)]">{tier.label}</p>
          <p className="mt-1 flex items-center gap-1 text-[11px] text-[var(--muted)]">
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
        </div>

        <div className="mt-3 flex flex-col gap-1.5">
          <p className="px-1 text-[11px] font-semibold text-[var(--muted)]">Lộ trình mốc lửa</p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {getAllFlameTiers().map((t) => {
              const reached = tier.id === t.id;
              return (
                <div
                  key={t.id}
                  className={`flex shrink-0 flex-col items-center gap-1 rounded-xl px-2.5 py-2 ${
                    reached ? "ring-2 ring-offset-1" : "opacity-60"
                  }`}
                  style={{
                    background: `linear-gradient(145deg, ${t.from}, ${t.to})`,
                    ...(reached ? ({ ["--tw-ring-color" as string]: t.to } as never) : {}),
                  }}
                >
                  <span className="text-[10px] font-bold text-white drop-shadow-sm">{t.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-1.5">
          <p className="px-1 text-[11px] font-semibold text-[var(--muted)]">Phụ kiện cho {petName}</p>
          <div className="grid grid-cols-4 gap-2">
            {ACCESSORY_LIST.map((id) => {
              const unlocked = isAccessoryUnlocked(id, streak.current_streak);
              const selected = localAccessory === id;
              const seasonal = isAccessorySeasonal(id);
              return (
                <button
                  key={id}
                  type="button"
                  disabled={!unlocked}
                  onClick={() => handlePickAccessory(id)}
                  className={`relative flex flex-col items-center gap-1 rounded-xl p-2 text-center transition ${
                    selected ? "bg-[var(--brand-light)] ring-2 ring-[var(--brand)]" : "bg-[#fbf7f8]"
                  } ${unlocked ? "active:scale-95" : "opacity-50"}`}
                >
                  {!unlocked && (
                    <span className="absolute right-1 top-1 text-[var(--muted)]">
                      <LockIcon className="h-3 w-3" />
                    </span>
                  )}
                  <PetAvatar
                    species={species}
                    stage={pet.stage === "egg" ? "baby" : pet.stage}
                    mood="happy"
                    variant={variant}
                    accessory={id}
                    size={44}
                    interactive={false}
                  />
                  <span className="text-[9px] font-medium leading-tight text-[var(--foreground)]">
                    {ACCESSORY_LABEL[id]}
                  </span>
                  {!unlocked && (
                    <span className="text-[8px] text-[var(--muted)]">
                      {seasonal ? "Theo mùa" : `Cần ${accessoryUnlockStreak(id)} ngày`}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          {accessoryError && <p className="px-1 text-[11px] text-red-500">{accessoryError}</p>}
        </div>
      </div>
    </div>
  );
}
