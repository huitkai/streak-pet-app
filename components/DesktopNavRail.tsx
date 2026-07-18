"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Avatar from "@/components/Avatar";
import {
  HomeIcon,
  CompassIcon,
  ReelIcon,
  ChatBubbleIcon,
  HeartIcon,
  PlusIcon,
  PawIcon,
} from "@/components/icons";

/**
 * Thanh điều hướng dọc bên trái kiểu Instagram web (chỉ hiện >=1024px, tránh
 * chật chội chồng lấn với 2 cột list/chat vốn đã bật ở >=768px). Chỉ 2 mục
 * "Trang chủ" và "Tin nhắn" có chức năng thật (app hiện chỉ có 2 khu vực đó);
 * các mục còn lại (Khám phá, Reels, Thông báo, Tạo mới) hiển thị cho đúng
 * "cảm giác" Instagram và mở 1 gợi ý nhỏ "sắp ra mắt" khi bấm.
 */
export default function DesktopNavRail({
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
  const isHome = pathname === "/";
  const isChat = pathname?.startsWith("/chat");
  const isProfile = pathname?.startsWith("/profile");

  const itemClass = (active: boolean) =>
    `flex items-center gap-3.5 rounded-xl px-3 py-2.5 transition active:scale-[0.97] ${
      active
        ? "bg-[var(--brand-light)] font-bold text-[var(--foreground)]"
        : "font-normal text-[var(--foreground)] hover:bg-white/5"
    }`;

  return (
    <nav className="app-ambient-bg relative hidden lg:flex lg:w-[72px] xl:w-[244px] lg:shrink-0 lg:flex-col lg:border-r lg:border-[var(--border)] lg:px-2 lg:py-5">
      <Link href="/" className="mb-6 flex items-center gap-2 px-3 py-2" aria-label="Streak & Pet">
        <PawIcon className="h-7 w-7 shrink-0 text-[var(--brand)]" strokeWidth={1.6} />
        <span className="hidden font-serif text-2xl italic tracking-tight text-[var(--foreground)] xl:inline">
          Streak&nbsp;Pet
        </span>
      </Link>

      <div className="flex flex-1 flex-col gap-1">
        <Link href="/" className={itemClass(isHome)} aria-label="Trang chủ">
          <HomeIcon className="h-6 w-6 shrink-0" filled={isHome} strokeWidth={2} />
          <span className="hidden xl:inline">Trang chủ</span>
        </Link>

        <button type="button" onClick={() => setSoon(true)} className={itemClass(false)} aria-label="Khám phá">
          <CompassIcon className="h-6 w-6 shrink-0" strokeWidth={1.8} />
          <span className="hidden xl:inline">Khám phá</span>
        </button>

        <button type="button" onClick={() => setSoon(true)} className={itemClass(false)} aria-label="Reels">
          <ReelIcon className="h-6 w-6 shrink-0" strokeWidth={1.8} />
          <span className="hidden xl:inline">Reels</span>
        </button>

        <Link href="/chat" className={itemClass(!!isChat)} aria-label="Tin nhắn">
          <ChatBubbleIcon className="h-6 w-6 shrink-0" strokeWidth={isChat ? 2.2 : 1.8} />
          <span className="hidden xl:inline">Tin nhắn</span>
        </Link>

        <button type="button" onClick={() => setSoon(true)} className={itemClass(false)} aria-label="Thông báo">
          <HeartIcon className="h-6 w-6 shrink-0" strokeWidth={1.8} />
          <span className="hidden xl:inline">Thông báo</span>
        </button>

        <button type="button" onClick={() => setSoon(true)} className={itemClass(false)} aria-label="Tạo mới">
          <PlusIcon className="h-6 w-6 shrink-0" strokeWidth={1.8} />
          <span className="hidden xl:inline">Tạo mới</span>
        </button>

        {myUserId && (
          <Link href={`/profile/${myUserId}`} className={itemClass(!!isProfile)} aria-label="Trang cá nhân">
            <Avatar url={avatarUrl} name={displayName} size={24} />
            <span className="hidden xl:inline">Trang cá nhân</span>
          </Link>
        )}
      </div>

      {soon && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setSoon(false)}>
          <div className="absolute inset-0 bg-black/35" aria-hidden />
          <div
            className="widget-card relative w-full max-w-xs rounded-2xl p-5 text-center shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm text-[var(--muted)]">Tính năng này đang được phát triển, quay lại sau nhé 💗</p>
            <button
              type="button"
              onClick={() => setSoon(false)}
              className="mt-4 w-full rounded-xl bg-[var(--brand)] py-2 text-sm font-semibold text-white transition active:scale-95"
            >
              Đã hiểu
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
