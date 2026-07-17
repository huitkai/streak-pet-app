import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient, getSessionUser } from "@/lib/supabase/server";
import ProfileEditor, { type ProfileStatItem, type ProfileTagItem } from "@/components/ProfileEditor";
import ProfileHeaderActions from "@/components/ProfileHeaderActions";
import Avatar from "@/components/Avatar";
import PetAvatar from "@/components/PetAvatar";
import { ArrowLeftIcon, FlameIcon, ImageIcon } from "@/components/icons";
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
    <div className="safe-top safe-bottom flex flex-1 flex-col bg-[var(--background)]">
      <header className="absolute left-0 right-0 top-0 z-10 flex items-center justify-between gap-2 px-2 py-2.5 safe-top">
        <div className="flex min-w-0 items-center gap-2">
          <Link
            href="/"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-sm transition-transform active:scale-90"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </Link>
        </div>
        {isSelf && <ProfileHeaderActions />}
      </header>

      <div className="flex-1 overflow-y-auto">
        {isSelf ? (
          <ProfileEditor userId={user.id} profile={targetProfile} stats={stats} tags={tags} />
        ) : (
          <div className="flex flex-col">
            <div className="relative h-56 w-full overflow-hidden bg-gradient-to-br from-[var(--brand-light)] via-[#ffc2d6] to-[var(--brand)]">
              {targetProfile.banner_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={targetProfile.banner_url} alt="" className="h-full w-full object-cover" />
              ) : targetProfile.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={targetProfile.avatar_url}
                  alt=""
                  className="h-full w-full scale-125 object-cover opacity-70 blur-2xl"
                />
              ) : null}
              <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-black/25" />
            </div>

            <div className="-mt-12 flex flex-col items-center px-4 pb-2">
              <div className="rounded-full ring-4 ring-[var(--background)]">
                <Avatar url={targetProfile.avatar_url} name={targetProfile.display_name} size={96} />
              </div>
              <p className="mt-3 text-lg font-bold text-[var(--foreground)]">
                {targetProfile.display_name || "Người ấy"}
              </p>

              {tags.length > 0 && (
                <div className="mt-3 flex flex-wrap justify-center gap-2">
                  {tags.map((t, i) => (
                    <span
                      key={i}
                      className="rounded-full bg-[var(--brand-light)] px-3 py-1 text-xs font-semibold text-[var(--brand-dark)]"
                    >
                      {t.emoji ? `${t.emoji} ` : ""}
                      {t.label}
                    </span>
                  ))}
                </div>
              )}

              {stats.length > 0 && (
                <div className="mt-5 grid w-full max-w-sm grid-cols-3 gap-2">
                  {stats.map((s, i) => (
                    <div
                      key={i}
                      className="flex flex-col items-center gap-1 rounded-2xl bg-[var(--brand)]/95 px-2 py-3 text-white shadow-sm"
                    >
                      <div className="flex items-center gap-1">
                        {s.icon === "flame" ? (
                          <FlameIcon className="h-4 w-4 text-orange-300" />
                        ) : s.icon === "image" ? (
                          <ImageIcon className="h-4 w-4 text-white/80" />
                        ) : (
                          <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-white/80">
                            <rect x="3" y="4" width="18" height="17" rx="2" stroke="currentColor" strokeWidth="1.8" />
                            <path d="M3 9h18M8 2v4M16 2v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                          </svg>
                        )}
                        <span className="text-base font-bold leading-none">{s.value}</span>
                      </div>
                      <span className="text-[11px] font-medium text-white/85">{s.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

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
