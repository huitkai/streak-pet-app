"use client";

import { signOut } from "@/lib/actions";
import {
  XIcon,
  BellIcon,
  LockIcon,
  PaletteIcon,
  MailIcon,
  ShieldCheckIcon,
  ChevronRightIcon,
  LogOutIcon,
} from "@/components/icons";

type SettingsRow = {
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
};

function Row({ icon, label, sublabel }: SettingsRow) {
  return (
    <button
      type="button"
      className="flex w-full items-center gap-3 px-1 py-3 text-left transition active:scale-[0.99] active:bg-black/5"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--brand-light)] text-[var(--brand-dark)]">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[14.5px] font-medium text-[var(--foreground)]">{label}</span>
        {sublabel && <span className="block text-xs text-[var(--muted)]">{sublabel}</span>}
      </span>
      <ChevronRightIcon className="h-4 w-4 shrink-0 text-[var(--muted)]" />
    </button>
  );
}

export default function SettingsSheet({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/35 animate-pop-in" onClick={onClose} aria-hidden />
      <div className="safe-bottom animate-sheet-up relative flex w-full max-w-md flex-col rounded-t-3xl bg-[var(--surface)] shadow-xl max-h-[85vh]">
        <div className="flex items-center justify-between px-5 pt-5 pb-2">
          <h2 className="text-lg font-bold text-[var(--foreground)]">Cài đặt và hoạt động</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-black/5 text-[var(--muted)]"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-2">
          <p className="mb-1 mt-3 px-1 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            Cách bạn dùng ứng dụng
          </p>
          <div className="divide-y divide-[var(--border)]">
            <Row icon={<BellIcon className="h-4.5 w-4.5" />} label="Thông báo" />
            <Row icon={<PaletteIcon className="h-4.5 w-4.5" />} label="Giao diện & chủ đề" />
          </div>

          <p className="mb-1 mt-5 px-1 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            Ai có thể xem nội dung của bạn
          </p>
          <div className="divide-y divide-[var(--border)]">
            <Row icon={<LockIcon className="h-4.5 w-4.5" />} label="Quyền riêng tư" />
            <Row icon={<ShieldCheckIcon className="h-4.5 w-4.5" />} label="Bảo mật tài khoản" />
          </div>

          <p className="mb-1 mt-5 px-1 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            Hỗ trợ
          </p>
          <div className="divide-y divide-[var(--border)]">
            <Row icon={<MailIcon className="h-4.5 w-4.5" />} label="Trợ giúp" sublabel="Báo cáo sự cố, gửi phản hồi" />
          </div>

          <div className="mt-6 border-t border-[var(--border)] pt-3">
            <form action={signOut}>
              <button
                type="submit"
                className="flex w-full items-center gap-3 rounded-xl px-1 py-3 text-left text-[14.5px] font-semibold text-red-500 transition active:scale-[0.99] active:bg-red-50"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-50">
                  <LogOutIcon className="h-4.5 w-4.5" />
                </span>
                Đăng xuất
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
