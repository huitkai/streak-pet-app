import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient, getSessionUser } from "@/lib/supabase/server";
import ProfileEditor from "@/components/ProfileEditor";
import ProfileHeaderActions from "@/components/ProfileHeaderActions";
import Avatar from "@/components/Avatar";
import PetAvatar from "@/components/PetAvatar";
import FlameBadge from "@/components/FlameBadge";
import { ArrowLeftIcon, TrophyIcon } from "@/components/icons";
import { STAGE_LABEL, SPECIES_LABEL, variantForCouple, type PetSpecies } from "@/lib/pets";
import type { PetAccessoryValue } from "@/lib/types";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId: targetId } = await params;
  const supabase = await createClient();
  const user = await getSessionUser(supabase);
  if (!user) redirect("/login");

  const isSelf = user.id === targetId;

  const [{ data: targetProfile }, { data: couple }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", targetId).maybeSingle(),
    supabase
      .from("couples")
      .select("*")
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .maybeSingle(),
  ]);

  const isPartner = !!couple && (couple.user1_id === targetId || couple.user2_id === targetId);

  if (!targetProfile || (!isSelf && !isPartner)) {
    return (
      <div className="safe-top flex flex-1 flex-col bg-[var(--background)]">
        <header className="flex items-center gap-2 border-b border-[var(--border)] bg-[var(--surface)] px-2 py-2.5">
          <Link href="/" className="flex h-8 w-8 items-center justify-center rounded-full transition-transform active:scale-90 active:bg-black/5">
            <ArrowLeftIcon className="h-5 w-5" />
          </Link>
          <h1 className="text-[15px] font-semibold">Hồ sơ</h1>
        </header>
        <p className="mt-10 text-center text-sm text-[var(--muted)]">
          Không tìm thấy hồ sơ này, hoặc bạn không có quyền xem.
        </p>
      </div>
    );
  }

  let streakCurrent = 0;
  let streakLongest = 0;
  let petStage: string | null = null;
  let species: PetSpecies | null = null;

  if (couple) {
    const [{ data: streak }, { data: pet }] = await Promise.all([
      supabase.from("streaks").select("*").eq("couple_id", couple.id).maybeSingle(),
      supabase.from("pets").select("*").eq("couple_id", couple.id).maybeSingle(),
    ]);
    streakCurrent = streak?.current_streak ?? 0;
    streakLongest = streak?.longest_streak ?? 0;
    petStage = pet?.stage ?? null;
    species = (couple.pet_species ?? "cat") as PetSpecies;
  }

  return (
    <div className="safe-top safe-bottom flex flex-1 flex-col bg-[var(--background)]">
      <header className="flex items-center justify-between gap-2 border-b border-[var(--border)] bg-[var(--surface)] px-2 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <Link href="/" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-transform active:scale-90 active:bg-black/5">
            <ArrowLeftIcon className="h-5 w-5" />
          </Link>
          <h1 className="truncate text-[15px] font-semibold text-[var(--foreground)]">
            {isSelf ? "Hồ sơ của bạn" : targetProfile.display_name || "Hồ sơ"}
          </h1>
        </div>
        {isSelf && <ProfileHeaderActions />}
      </header>

      <div className="flex-1 overflow-y-auto">
        {/* Banner mềm phía sau avatar để trang hồ sơ có chiều sâu, thay vì
            avatar trôi nổi trên nền trắng trơn như trước. */}
        <div className="h-24 w-full bg-gradient-to-br from-[var(--brand-light)] via-[#ffd3e3] to-[var(--brand)]" />

        {isSelf ? (
          <ProfileEditor userId={user.id} profile={targetProfile} />
        ) : (
          <div className="-mt-12 flex flex-col items-center px-4 pb-6">
            <div className="rounded-full ring-4 ring-[var(--background)]">
              <Avatar url={targetProfile.avatar_url} name={targetProfile.display_name} size={96} />
            </div>
            <p className="mt-3 text-lg font-bold text-[var(--foreground)]">
              {targetProfile.display_name || "Người ấy"}
            </p>
          </div>
        )}

        {couple && species && (
          <div className="mx-4 mb-6 flex flex-col items-center rounded-2xl bg-[var(--surface)] p-5 shadow-sm">
            <p className="mb-3 text-xs font-semibold text-[var(--muted)]">
              {isSelf ? "Đang cùng nuôi" : `Đang nuôi cùng bạn`}
            </p>
            <PetAvatar
              species={species}
              stage={(petStage as "egg" | "baby" | "teen" | "adult" | "legendary") || "egg"}
              mood="happy"
              variant={couple ? variantForCouple(couple.id, species) : "radiant"}
              accessory={(couple?.pet_accessory as PetAccessoryValue) ?? "none"}
              size={80}
              interactive={false}
            />
            <p className="mt-2 text-sm font-semibold text-[var(--foreground)]">
              {couple.pet_name} · {SPECIES_LABEL[species]}
            </p>
            <p className="text-xs text-[var(--muted)]">
              {petStage ? STAGE_LABEL[petStage as keyof typeof STAGE_LABEL] : ""}
            </p>

            <div className="mt-4 flex items-center gap-4">
              <FlameBadge streak={streakCurrent} size="md" />
              <span className="flex items-center gap-1 text-xs text-[var(--muted)]">
                <TrophyIcon className="h-3.5 w-3.5" /> Kỷ lục {streakLongest} ngày
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
