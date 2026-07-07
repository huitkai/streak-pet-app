"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Avatar from "@/components/Avatar";
import { HomeIcon, CompassIcon, ReelIcon, HeartIcon, PlusIcon } from "@/components/icons";

/**
 * Thanh tab dưới cùng kiểu Instagram mobile — chỉ hiện <768px (dưới breakpoint
 * 2 cột của AppShell). "Trang chủ" luôn dẫn về "/" (danh sách hội thoại /
 * empty-state chat). Các icon Khám phá / Reels / Thông báo chỉ mang tính
 * trang trí cho đúng cảm giác Instagram — bấm vào hiện gợi ý nhỏ "sắp ra mắt".
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

  const btnClass = "flex h-11 w-11 items-center justify-center rounded-full text-[var(--foreground)] transition active:scale-90 active:bg-black/5";

  return (
    <>
      <nav className="safe-bottom flex shrink-0 items-center justify-around border-t border-[var(--border)] bg-[var(--surface)] md:hidden">
        <Link href="/" aria-label="Trang chủ" className={btnClass}>
          <HomeIcon className="h-6 w-6" filled={isHome} strokeWidth={2} />
        </Link>
        <button type="button" onClick={() => setSoon(true)} aria-label="Khám phá" className={btnClass}>
          <CompassIcon className="h-6 w-6" strokeWidth={1.8} />
        </button>
        <button type="button" onClick={() => setSoon(true)} aria-label="Tạo mới" className={btnClass}>
          <PlusIcon className="h-6 w-6" strokeWidth={1.8} />
        </button>
        <button type="button" onClick={() => setSoon(true)} aria-label="Reels" className={btnClass}>
          <ReelIcon className="h-6 w-6" strokeWidth={1.8} />
        </button>
        <button type="button" onClick={() => setSoon(true)} aria-label="Thông báo" className={btnClass}>
          <HeartIcon className="h-6 w-6" strokeWidth={1.8} />
        </button>
        {myUserId ? (
          <Link href={`/profile/${myUserId}`} aria-label="Trang cá nhân" className="flex h-11 w-11 items-center justify-center active:scale-90">
            <span className={isProfile ? "rounded-full ring-2 ring-[var(--foreground)] ring-offset-2 ring-offset-[var(--surface)]" : ""}>
              <Avatar url={avatarUrl} name={displayName} size={26} />
            </span>
          </Link>
        ) : (
          <div className="h-11 w-11" />
        )}
      </nav>

      {soon && (
        <div className="fixed inset-0 z-50 flex items-end justify-center md:hidden" onClick={() => setSoon(false)}>
          <div className="absolute inset-0 bg-black/35" aria-hidden />
          <div
            className="safe-bottom animate-sheet-up relative w-full max-w-md rounded-t-3xl bg-[var(--surface)] p-6 text-center shadow-xl"
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
