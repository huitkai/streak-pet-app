import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient, getSessionUser } from "@/lib/supabase/server";
import ProfileEditor, {
  AmbientGlow,
  GlassStatCards,
  GlassTagRow,
  HeroBadge,
  HeroBackground,
  HeroEyebrow,
  ProfilePipeStats,
  type ProfileStatItem,
  type ProfileTagItem,
} from "@/components/ProfileEditor";
import ProfileHeaderActions from "@/components/ProfileHeaderActions";
import PetShowcaseCard from "@/components/PetShowcaseCard";
import { ArrowLeftIcon, PawIcon } from "@/components/icons";
import { STAGE_ORDER, type PetSpecies } from "@/lib/pets";
import { SHOW_COUPLE_FEATURES } from "@/lib/feature-flags";
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

  // Con số nổi bật phía trên tên (nhịp giống "24.978 Followers" trong mẫu):
  // số ngày cùng nhau — chỉ số cảm xúc nhất trong app cặp đôi này.
  const eyebrow = SHOW_COUPLE_FEATURES && couple ? { value: activeDays, label: "ngày bên nhau" } : null;

  // Hàng card thống kê bên dưới tên: cố tình KHÔNG lặp lại "ngày bên nhau" ở
  // trên, để mỗi card mang một lát cắt riêng — giống Sessions/Age/Videos.
  const stats: ProfileStatItem[] = couple
    ? [
        { icon: "flame", value: streakCurrent, label: "Chuỗi ngày" },
        { icon: "image", value: photoCount, label: "Ảnh đã gửi" },
        {
          icon: "stage",
          value: `${STAGE_ORDER.indexOf((petStage as (typeof STAGE_ORDER)[number]) || "egg") + 1}/5`,
          label: "Cấp độ thú cưng",
        },
      ]
    : [];

  // TODO: chưa có nguồn dữ liệu tag/interest thật (couple đang bị ẩn theo
  // SHOW_COUPLE_FEATURES) — dùng placeholder trung tính giống ảnh tham chiếu
  // ("#Minimalism #DesignThinking #Photography") cho tới khi có dữ liệu thật.
  const tags: ProfileTagItem[] = SHOW_COUPLE_FEATURES
    ? [
        ...(isSelf ? [{ label: isPartner || couple ? "Đã ghép cặp" : "Đang độc thân" }] : [{ label: "Đối tác của bạn" }]),
        ...(couple && species ? [{ emoji: "🐾", label: couple.pet_name }] : []),
      ]
    : [{ label: "#Chưa có tag" }];

  return (
    <div className="safe-bottom flex min-h-0 flex-1 flex-col bg-[var(--background)]">
      <div className="min-h-0 flex-1 overflow-y-auto">
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
            <ProfileEditor userId={user.id} profile={targetProfile} stats={stats} tags={tags} eyebrow={eyebrow} />
          ) : (
            <div className="relative isolate flex min-h-[600px] flex-col items-center overflow-hidden pb-8 pt-24">
              <HeroBackground imageUrl={targetProfile.banner_url || targetProfile.avatar_url} />

              <div className="flex flex-1 flex-col items-center justify-end px-5 pt-40">
                <HeroBadge label="Thú cưng chung">
                  <PawIcon className="h-5 w-5" />
                </HeroBadge>

                {eyebrow && (
                  <div className="mt-3">
                    <HeroEyebrow value={eyebrow.value} label={eyebrow.label} />
                  </div>
                )}

                <p className="mt-1.5 text-[26px] font-bold leading-tight text-white drop-shadow-sm">
                  {targetProfile.display_name || "Người ấy"}
                </p>

                {/* Quote + bio đúng mockup — TODO: chưa có cột quote/bio thật
                    trong ProfileRow, đặt sẵn UI, đổ dữ liệu thật khi có. */}
                <p className="mt-2 max-w-xs text-center text-[15px] font-semibold text-white/90">
                  &ldquo;Chưa có câu giới thiệu&rdquo;
                </p>
                <p className="mt-1.5 max-w-xs text-center text-[12.5px] leading-relaxed text-white/60">
                  Chưa có tiểu sử.
                </p>

                <div className="mt-3">
                  <GlassTagRow tags={tags} />
                </div>

                <div className="mt-6 w-full">
                  <ProfilePipeStats
                    stats={[
                      { value: "0", label: "Followers" },
                      { value: "0", label: "Following" },
                      { value: "0", label: "Posts" },
                      { value: "N/A", label: "Activity" },
                    ]}
                  />
                </div>

                {SHOW_COUPLE_FEATURES && stats.length > 0 && (
                  <div className="mt-7 w-full max-w-sm">
                    <p className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-white/60">
                      Thống kê
                    </p>
                    <GlassStatCards stats={stats} />
                  </div>
                )}

                {/* Lưới "Chats" đúng mockup (.chats-grid: các ô chủ đề/nhóm
                    ảnh nhỏ) — TODO: app hiện chưa có khái niệm nhiều nhóm
                    chat/chủ đề theo từng hồ sơ, đây là chỗ đặt sẵn UI khung
                    (viền nét đứt, không bịa ảnh/số liệu giả), đổ dữ liệu
                    thật (ảnh đại diện nhóm + số thành viên) khi có tính năng
                    nhóm/chủ đề. */}
                <div className="mt-7 w-full max-w-sm">
                  <p className="mb-2.5 text-left text-xs font-semibold uppercase tracking-wide text-white/60">
                    Chats
                  </p>
                  <div className="grid grid-cols-2 gap-2.5">
                    {[0, 1].map((i) => (
                      <div
                        key={i}
                        className="flex h-[100px] items-end rounded-2xl border border-dashed border-white/20 bg-white/5 p-2.5"
                      >
                        <span className="text-[11px] text-white/40">Chưa có dữ liệu</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {SHOW_COUPLE_FEATURES && couple && species && (
          <AmbientGlow>
            <PetShowcaseCard
              coupleId={couple.id}
              petName={couple.pet_name}
              species={species}
              stage={(petStage as "egg" | "baby" | "teen" | "adult" | "legendary") || "egg"}
              accessory={(couple.pet_accessory as PetAccessoryValue) ?? "none"}
              activeDays={activeDays}
              isSelf={isSelf}
            />
          </AmbientGlow>
        )}
      </div>
    </div>
  );
}
