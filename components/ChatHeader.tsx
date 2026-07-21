"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { PetRow, ProfileRow, StreakRow, PetStage } from "@/lib/types";
import { STAGE_ORDER, variantForCouple, type PetSpecies } from "@/lib/pets";
import FlameBadge from "@/components/FlameBadge";
import PetSheet from "@/components/PetSheet";
import ChatSettingsSheet from "@/components/ChatSettingsSheet";
import PetEvolutionCelebration from "@/components/PetEvolutionCelebration";
import Avatar from "@/components/Avatar";
import { ChevronLeftIcon, MoreVerticalIcon, PhoneIcon, VideoIcon } from "@/components/icons";
import { usePartnerOnline, formatLastSeen } from "@/lib/presence";
import { useChatTheme } from "@/lib/chat-theme-context";
import { SHOW_COUPLE_FEATURES } from "@/lib/featureFlags";

export default function ChatHeader({
  coupleId,
  userId,
  partnerId,
  petName,
  species,
  initialPet,
  initialStreak,
  initialNickname,
  initialNicknameRaw,
  partnerProfile,
  coupleCreatedAt,
  initialPhotoCount,
}: {
  coupleId: string;
  userId: string;
  partnerId: string | null;
  petName: string;
  species: PetSpecies;
  initialPet: PetRow;
  initialStreak: StreakRow;
  /** Tên hiệu lực đã hiển thị cho đối phương (biệt danh nếu có, fallback display_name). */
  initialNickname: string;
  /** Biệt danh THÔ mình đã đặt (rỗng nếu chưa đặt) — dùng để điền sẵn vào sheet. */
  initialNicknameRaw: string;
  myProfile: ProfileRow | null;
  partnerProfile: ProfileRow | null;
  /** Ngày tạo cặp đôi — dùng tính "số ngày bên nhau" ở màn cài đặt chat. */
  coupleCreatedAt: string;
  /** Tổng số ảnh đã gửi trong đoạn chat — hiện ở thống kê màn cài đặt chat. */
  initialPhotoCount: number;
}) {
  const [pet, setPet] = useState(initialPet);
  const [streak, setStreak] = useState(initialStreak);
  const [partner, setPartner] = useState(partnerProfile);
  const { themeColor, setThemeColor, accessory } = useChatTheme();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [nickname, setNickname] = useState(initialNickname);
  const [nicknameRaw, setNicknameRaw] = useState(initialNicknameRaw);
  const [celebrateStage, setCelebrateStage] = useState<PetStage | null>(null);
  const isPartnerOnline = usePartnerOnline(coupleId, userId, partnerId);
  const variant = useMemo(() => variantForCouple(coupleId, species), [coupleId, species]);
  // Chỉ để ép re-render mỗi phút, giúp chữ "Hoạt động X phút trước" luôn khớp
  // thời gian thực thay vì đứng yên từ lúc trang được tải.
  const [, forceTick] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => forceTick((n) => n + 1), 30_000);
    return () => window.clearInterval(t);
  }, []);
  // `formatLastSeen` tính theo Date.now() của máy đang chạy code — trên
  // server (SSR) và trên trình duyệt (hydrate) là 2 thời điểm/timezone khác
  // nhau, nên nếu render ngay từ đầu sẽ gây lệch HTML server/client (lỗi
  // React #418, crash trang khi mở 1 đoạn chat). Chỉ render chữ này sau khi
  // đã mount xong ở client.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // ---- Phát hiện pet TIẾN HÓA lên giai đoạn mới -> bật hiệu ứng ăn mừng.
  // Không ăn mừng ngay lần mở app đầu tiên (chỉ ghi nhận mốc hiện tại), chỉ
  // ăn mừng khi có 1 lần cập nhật thật sự đổi stage lên cao hơn trong phiên này.
  const prevStageRef = useRef<PetStage | null>(null);
  useEffect(() => {
    const storageKey = `pet-evo-seen-${coupleId}`;
    if (prevStageRef.current === null) {
      const seen = typeof window !== "undefined" ? window.localStorage.getItem(storageKey) : null;
      prevStageRef.current = (seen as PetStage | null) ?? pet.stage;
      return;
    }
    if (pet.stage !== prevStageRef.current && STAGE_ORDER.indexOf(pet.stage) > STAGE_ORDER.indexOf(prevStageRef.current)) {
      setCelebrateStage(pet.stage);
      if (typeof window !== "undefined") window.localStorage.setItem(storageKey, pet.stage);
    }
    prevStageRef.current = pet.stage;
  }, [pet.stage, coupleId]);

  useEffect(() => {
    const supabase = createClient();
    const petChannel = supabase
      .channel(`header-pet-${coupleId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "pets", filter: `couple_id=eq.${coupleId}` },
        (payload) => setPet(payload.new as PetRow)
      )
      .subscribe();

    const streakChannel = supabase
      .channel(`header-streak-${coupleId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "streaks", filter: `couple_id=eq.${coupleId}` },
        (payload) => setStreak(payload.new as StreakRow)
      )
      .subscribe();

    // Channel `couples` (theme + phụ kiện) đã gộp vào `couple-sync-${coupleId}`
    // trong ChatThemeProvider (lib/chat-theme-context.tsx) — accessory đọc qua
    // useChatTheme() ở trên, không mở channel riêng ở đây nữa.

    const profileChannel = supabase
      .channel(`header-profiles-${coupleId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles" }, (payload) => {
        const p = payload.new as ProfileRow;
        if (p.id !== userId) {
          setPartner(p);
          // Chỉ cập nhật tên hiển thị theo display_name mới nếu MÌNH chưa đặt
          // biệt danh riêng — có biệt danh rồi thì luôn ưu tiên biệt danh.
          setNickname((current) => (nicknameRaw ? current : p.display_name || "Người ấy"));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(petChannel);
      supabase.removeChannel(streakChannel);
      supabase.removeChannel(profileChannel);
    };
  }, [coupleId, userId, nicknameRaw]);

  return (
    <>
      <header className="safe-top glass-surface relative z-20 flex shrink-0 items-center gap-0.5 rounded-b-3xl border-x-0 border-t-0 px-1.5 py-3">
        <Link
          href="/"
          aria-label="Về danh sách trò chuyện"
          className="flex h-10 w-9 shrink-0 items-center justify-center rounded-full text-[var(--foreground)] transition-transform active:scale-90 active:bg-white/10"
        >
          <ChevronLeftIcon className="h-6 w-6" />
        </Link>

        <span
          className={`flex shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-semibold ${
            isPartnerOnline ? "text-emerald-400" : "text-[var(--muted)]"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${isPartnerOnline ? "bg-emerald-400" : "bg-[var(--muted)]"}`}
          />
          {isPartnerOnline ? "Đang hoạt động" : mounted ? formatLastSeen(partner?.last_seen) : "\u00A0"}
        </span>

        {/* Bấm vào avatar/tên đối phương -> mở trang hồ sơ của họ, giống TikTok */}
        <Link
          href={partnerId ? `/profile/${partnerId}` : "#"}
          className="ml-auto flex min-w-0 max-w-[70%] items-center gap-2 rounded-full border border-white/10 bg-white/10 py-1 pl-1 pr-3 transition-transform active:scale-[0.98] active:opacity-80"
        >
          <span
            className={`relative shrink-0 rounded-full p-[2px] ${isPartnerOnline ? "avatar-ring-online" : "avatar-ring-offline"}`}
          >
            <span className="block rounded-full border-2 border-[var(--background)]">
              <Avatar url={partner?.avatar_url} name={nickname || petName} size={30} />
            </span>
            {isPartnerOnline && (
              <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-[var(--background)] bg-emerald-400" />
            )}
          </span>
          <div className="flex min-w-0 flex-1 flex-col items-start text-left">
            {/* Streak trước đây gắn làm huy hiệu ở góc avatar -> giờ chỉ
                ẩn hiển thị theo SHOW_COUPLE_FEATURES (bật lại được sau),
                logic PetSheet/streak phía dưới KHÔNG bị xoá. */}
            <span className="flex min-w-0 items-center gap-1.5">
              <span className="truncate text-[13px] font-semibold text-[var(--foreground)]">{nickname}</span>
              {SHOW_COUPLE_FEATURES && streak.current_streak > 0 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setSheetOpen(true);
                  }}
                  aria-label="Xem chuỗi và pet"
                  className="shrink-0 transition active:scale-90"
                >
                  <FlameBadge streak={streak.current_streak} size="sm" variant="pill" />
                </button>
              )}
            </span>
          </div>
        </Link>

        {/* Gọi thoại/video: giữ nguyên chỗ này, backend nối sau. Tăng kích
            thước icon lên (avatar đã thu nhỏ) để hài hoà, cân đối hơn giữa
            avatar nhỏ và cụm nút bên phải, giống ảnh tham khảo. */}
        <button
          type="button"
          aria-label="Gọi thoại"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--foreground)] transition active:scale-90 active:bg-white/10"
        >
          <PhoneIcon className="h-5 w-5" strokeWidth={1.8} />
        </button>

        <button
          type="button"
          aria-label="Gọi video"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--foreground)] transition active:scale-90 active:bg-white/10"
        >
          <VideoIcon className="h-5 w-5" strokeWidth={1.8} />
        </button>

        {/* Icon "..." nằm ngang cũ tốn bề ngang hơn -> đổi thành 3 chấm nằm
            dọc (MoreVerticalIcon), gọn hơn để không góp phần gây chồng nút. */}
        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          aria-label="Tuỳ chỉnh đoạn chat"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--foreground)] transition active:scale-90 active:bg-white/10"
        >
          <MoreVerticalIcon className="h-5 w-5" />
        </button>
      </header>

      {sheetOpen && (
        <PetSheet
          coupleId={coupleId}
          petName={petName}
          species={species}
          variant={variant}
          accessory={accessory}
          pet={pet}
          streak={streak}
          onClose={() => setSheetOpen(false)}
        />
      )}

      {settingsOpen && (
        <ChatSettingsSheet
          coupleId={coupleId}
          currentThemeColor={themeColor}
          currentNickname={nicknameRaw}
          partnerRealName={partner?.display_name || "Người ấy"}
          partnerAvatarUrl={partner?.avatar_url}
          nickname={nickname}
          statusLabel={isPartnerOnline ? "Đang hoạt động" : mounted ? formatLastSeen(partner?.last_seen) : ""}
          isPartnerOnline={isPartnerOnline}
          streakCurrent={streak.current_streak}
          photoCount={initialPhotoCount}
          coupleCreatedAt={coupleCreatedAt}
          onClose={() => setSettingsOpen(false)}
          onThemeChange={setThemeColor}
          onNicknameChange={(name) => {
            setNicknameRaw(name);
            setNickname(name || partner?.display_name || "Người ấy");
          }}
        />
      )}

      {celebrateStage && (
        <PetEvolutionCelebration
          petName={petName}
          species={species}
          stage={celebrateStage}
          variant={variant}
          accessory={accessory}
          onDone={() => setCelebrateStage(null)}
        />
      )}
    </>
  );
}
