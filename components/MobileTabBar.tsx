"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Avatar from "@/components/Avatar";
import { HomeIcon, PhoneIcon, ReelIcon } from "@/components/icons";

/**
 * Thanh tab dưới cùng — thanh kính nổi (glass pill), 4 mục: Chats / Call /
 * Updates / Profile, đúng bố cục trong ảnh tham chiếu. Chỉ hiện <768px
 * (dưới breakpoint 2 cột của AppShell). "Chats" luôn dẫn về "/" (danh sách
 * hội thoại / empty-state chat). Call & Updates chỉ mang tính trang trí cho
 * tới khi có tính năng thật — bấm vào hiện gợi ý nhỏ "sắp ra mắt".
 */
export default function MobileTabBar({
  myUserId,
  avatarUrl,
  displayName,
}: {
  myUserId: string | null;
  avatarUrl?: string | null;
  displayName?: string | null;
}) {
  const pathname = usePathname();
  const [soon, setSoon] = useState(false);
  const isHome = pathname === "/" || pathname?.startsWith("/chat");
  const isProfile = pathname?.startsWith("/profile");

  const tabClass = (active: boolean) =>
    `flex flex-1 flex-col items-center justify-center gap-1 rounded-full py-2 transition active:scale-95 ${
      active ? "text-[var(--foreground)]" : "text-[var(--muted)]"
    }`;

  return (
    <>
      <nav className="safe-bottom shrink-0 px-4 pb-3 pt-1 md:hidden">
        <div className="glass-pill mx-auto flex max-w-sm items-center rounded-full px-2 py-1 shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
          <Link href="/" aria-label="Chats" className={tabClass(isHome)}>
            <HomeIcon className="h-[22px] w-[22px]" filled={isHome} strokeWidth={2} />
            <span className="text-[10px] font-medium">Chats</span>
          </Link>
          <button type="button" onClick={() => setSoon(true)} aria-label="Call" className={tabClass(false)}>
            <PhoneIcon className="h-[22px] w-[22px]" strokeWidth={1.8} />
            <span className="text-[10px] font-medium">Call</span>
          </button>
          <button type="button" onClick={() => setSoon(true)} aria-label="Updates" className={tabClass(false)}>
            <ReelIcon className="h-[22px] w-[22px]" strokeWidth={1.8} />
            <span className="text-[10px] font-medium">Updates</span>
          </button>
          {myUserId ? (
            <Link href={`/profile/${myUserId}`} aria-label="Profile" className={tabClass(!!isProfile)}>
              <span className={isProfile ? "rounded-full ring-2 ring-[var(--brand)] ring-offset-2 ring-offset-transparent" : ""}>
                <Avatar url={avatarUrl} name={displayName} size={22} />
              </span>
              <span className="text-[10px] font-medium">Profile</span>
            </Link>
          ) : (
            <div className="flex-1" />
          )}
        </div>
      </nav>

      {soon && (
        <div className="fixed inset-0 z-50 flex items-end justify-center md:hidden" onClick={() => setSoon(false)}>
          <div className="absolute inset-0 bg-black/50" aria-hidden />
          <div
            className="glass-surface safe-bottom animate-sheet-up relative w-full max-w-md rounded-t-3xl p-6 text-center shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm text-[var(--muted)]">Tính năng này đang được phát triển, quay lại sau nhé 💗</p>
            <button
              type="button"
              onClick={() => setSoon(false)}
              className="mt-4 w-full rounded-xl bg-[var(--brand)] py-2.5 text-sm font-semibold text-white transition active:scale-95"
            >
              Đã hiểu
            </button>
          </div>
        </div>
      )}
    </>
  );
}
