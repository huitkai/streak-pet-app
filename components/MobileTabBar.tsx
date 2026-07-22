"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Avatar from "@/components/Avatar";
import { HomeIcon, ChatBubbleIcon, CameraIcon } from "@/components/icons";

/**
 * Thanh điều hướng dưới cùng — KHÔNG còn dạng thanh kính nền (glass pill)
 * như trước, mà là các nút tròn/pill TRẮNG NỔI RIÊNG LẺ trôi trên nội dung,
 * đúng bố cục trong ảnh tham chiếu (Home / "Chats" pill / Chụp nhanh /
 * Profile). Chỉ hiện <768px (dưới breakpoint 2 cột của AppShell).
 *
 * Nút "Chụp nhanh" ở giữa không tự mở camera ở đây (component này không có
 * coupleId/conversations) — nó phát 1 CustomEvent ("sp:open-camera") ra
 * window; ConversationListClient lắng nghe sự kiện này để mở
 * InstantSessionFlow, tránh phải prop-drill state qua AppShell/page.tsx.
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
  const isProfile = pathname?.startsWith("/profile");

  function openCamera() {
    window.dispatchEvent(new CustomEvent("sp:open-camera"));
  }

  const fbtn =
    "flex h-[50px] items-center justify-center rounded-full bg-white text-neutral-900 shadow-[0_8px_20px_rgba(0,0,0,0.35)] transition active:scale-90 shrink-0";

  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 flex items-center justify-center gap-3 px-4 pb-5 md:hidden">
      <Link href="/" aria-label="Home" className={`${fbtn} w-[50px]`}>
        <HomeIcon className="h-[21px] w-[21px]" strokeWidth={1.8} />
      </Link>

      <Link href="/" aria-label="Chats" className={`${fbtn} gap-2 px-[22px] text-[15px] font-semibold`}>
        <ChatBubbleIcon className="h-[18px] w-[18px]" strokeWidth={1.8} />
        Chats
      </Link>

      <button type="button" onClick={openCamera} aria-label="Chụp nhanh" className={`${fbtn} w-[50px]`}>
        <CameraIcon className="h-5 w-5" strokeWidth={1.7} />
      </button>

      {myUserId ? (
        <Link href={`/profile/${myUserId}`} aria-label="Profile" className={`${fbtn} w-[50px]`}>
          <span className={isProfile ? "rounded-full ring-2 ring-[var(--brand)] ring-offset-1" : ""}>
            <Avatar url={avatarUrl} name={displayName} size={22} />
          </span>
        </Link>
      ) : (
        <span className={`${fbtn} w-[50px] opacity-40`}>
          <Avatar url={undefined} name={undefined} size={22} />
        </span>
      )}
    </nav>
  );
}
