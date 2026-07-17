import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient, getSessionUser } from "@/lib/supabase/server";
import ProfileEditor, {
  GlassStatRow,
  GlassTagRow,
  HeroBackground,
  type ProfileStatItem,
  type ProfileTagItem,
} from "@/components/ProfileEditor";
import ProfileHeaderActions from "@/components/ProfileHeaderActions";
import PetAvatar from "@/components/PetAvatar";
import { ArrowLeftIcon } from "@/components/icons";
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
  let petStage: string | null = null;
  let species: PetSpecies | null = null;
  let activeDays = 0;
  let photoCount = 0;

  if (couple) {
    const [{ data: streak }, { data: pet }, { count: imgCount }] = await Promise.all([
      supabase.from("streaks").select("*").eq("couple_id", couple.id).maybeSingle(),
      supabase.from("pets").select("*").eq("couple_id", couple.id).maybeSingle(),
      supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("couple_id", couple.id)
        .eq("sender_id", targetId)
        .is("deleted_at", null)
        .or("content.like.::image::%,content.like.::stampphoto::%"),
    ]);
    streakCurrent = streak?.current_streak ?? 0;
    petStage = pet?.stage ?? null;
    species = (couple.pet_species ?? "cat") as PetSpecies;
    photoCount = imgCount ?? 0;
    const nowMs = new Date().getTime();
    activeDays = Math.max(
      1,
      Math.floor((nowMs - new Date(couple.created_at).getTime()) / 86_400_000) + 1
    );
  }

  const stats: ProfileStatItem[] = couple
    ? [
        { icon: "flame", value: streakCurrent, label: "Chuỗi" },
        { icon: "calendar", value: activeDays, label: "Ngày hoạt động" },
        { icon: "image", value: photoCount, label: "Ảnh" },
      ]
    : [];

  const tags: ProfileTagItem[] = [];
  if (couple && species) {
    tags.push({ emoji: "🐾", label: `${couple.pet_name} · ${SPECIES_LABEL[species]}` });
    if (petStage) tags.push({ label: STAGE_LABEL[petStage as keyof typeof STAGE_LABEL] });
  }

  return (
    <div className="safe-bottom flex flex-1 flex-col bg-[var(--background)]">
      <div className="flex-1 overflow-y-auto">
        <div className="relative">
          <header className="safe-top absolute inset-x-0 top-0 z-10 flex items-center justify-between px-3 pt-2.5">
            <Link
              href="/"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/25 bg-white/15 text-white backdrop-blur-md transition active:scale-90 active:bg-white/25"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </Link>
            {isSelf && <ProfileHeaderActions />}
          </header>

          {isSelf ? (
            <ProfileEditor userId={user.id} profile={targetProfile} stats={stats} tags={tags} />
          ) : (
            <div className="relative flex min-h-[640px] flex-col items-center overflow-hidden pb-8 pt-24">
              <HeroBackground imageUrl={targetProfile.banner_url || targetProfile.avatar_url} />

              <div className="flex flex-col items-center px-5">
                <div className="h-20 w-20 overflow-hidden rounded-full border-2 border-white/60 bg-white/10 shadow-lg backdrop-blur-md">
                  {targetProfile.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={targetProfile.avatar_url}
                      alt={targetProfile.display_name ?? "avatar"}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-2xl font-semibold text-white">
                      {(targetProfile.display_name?.trim()?.[0] ?? "?").toUpperCase()}
                    </div>
                  )}
                </div>

                <p className="mt-3 text-2xl font-bold text-white drop-shadow-sm">
                  {targetProfile.display_name || "Người ấy"}
                </p>

                <div className="mt-3">
                  <GlassTagRow tags={tags} />
                </div>

                <div className="mt-6 w-full">
                  <GlassStatRow stats={stats} />
                </div>
              </div>
            </div>
          )}
        </div>

        {couple && species && (
          <div className="mx-4 mb-6 mt-2 flex flex-col items-center rounded-2xl bg-[var(--surface)] p-5 shadow-sm">
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
          </div>
        )}
      </div>
    </div>
  );
}
