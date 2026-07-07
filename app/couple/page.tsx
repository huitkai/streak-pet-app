"use client";

import { useState, useTransition } from "react";
import { createCouple, joinCouple, signOut } from "@/lib/actions";
import { SPECIES_LIST, SPECIES_LABEL, SPECIES_DESC, type PetSpecies } from "@/lib/pets";
import PetAvatar from "@/components/PetAvatar";
import { UsersIcon, ArrowRightIcon } from "@/components/icons";

export default function CouplePage() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [species, setSpecies] = useState<PetSpecies>("cat");

  function handleCreate() {
    setError(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("pet_species", species);
      const res = await createCouple(formData);
      if (res?.error) setError(res.error);
    });
  }

  function handleJoin(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await joinCouple(formData);
      if (res?.error) setError(res.error);
    });
  }

  return (
    <div className="safe-top safe-bottom flex flex-1 items-center justify-center bg-[var(--background)] px-4">
      <div className="w-full max-w-sm rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-7 shadow-md">
        <div className="mb-1 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--brand-light)] text-[var(--brand)]">
            <UsersIcon className="h-5 w-5" />
          </div>
          <h1 className="text-xl font-bold text-[var(--foreground)]">Ghép cặp</h1>
        </div>
        <p className="mb-5 text-sm text-[var(--muted)]">
          Tạo cặp đôi mới hoặc nhập mã mời của người ấy
        </p>

        <p className="mb-2 text-xs font-semibold text-[var(--muted)]">Chọn loài pet ban đầu</p>
        <div className="mb-4 grid grid-cols-4 gap-1.5">
          {SPECIES_LIST.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSpecies(s)}
              className={`flex flex-col items-center rounded-xl p-1.5 transition ${
                species === s ? "bg-[var(--brand-light)] ring-2 ring-[var(--brand)]" : "hover:bg-black/5"
              }`}
            >
              <PetAvatar species={s} stage="baby" mood="happy" size={44} interactive={false} />
            </button>
          ))}
        </div>
        <p className="mb-5 rounded-xl bg-[#fbf7f8] px-3 py-2 text-xs text-[var(--muted)]">
          <span className="font-semibold text-[var(--foreground)]">{SPECIES_LABEL[species]}</span> — {SPECIES_DESC[species]}
        </p>

        <button
          onClick={handleCreate}
          disabled={isPending}
          className="mb-6 flex w-full items-center justify-center gap-1.5 rounded-xl bg-[var(--brand)] py-2.5 font-medium text-white transition hover:bg-[var(--brand-dark)] disabled:opacity-60"
        >
          {isPending && (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
          )}
          Tạo cặp đôi mới <ArrowRightIcon className="h-4 w-4" />
        </button>

        <div className="mb-4 flex items-center gap-2">
          <div className="h-px flex-1 bg-[var(--border)]" />
          <span className="text-xs text-[var(--muted)]">hoặc</span>
          <div className="h-px flex-1 bg-[var(--border)]" />
        </div>

        <form action={handleJoin}>
          <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">
            Mã mời của người ấy
          </label>
          <input
            name="invite_code"
            required
            placeholder="VD: AB12CD"
            className="mb-4 w-full rounded-xl border border-[var(--border)] px-3 py-2.5 uppercase outline-none focus:border-[var(--brand)]"
          />
          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-xl border border-[var(--brand)] py-2.5 font-medium text-[var(--brand-dark)] transition hover:bg-[var(--brand-light)] disabled:opacity-60"
          >
            {isPending ? "Đang xử lý..." : "Tham gia"}
          </button>
        </form>

        {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

        <form action={signOut} className="mt-6 text-center">
          <button className="text-sm text-[var(--muted)] hover:underline">Đăng xuất</button>
        </form>
      </div>
    </div>
  );
}
