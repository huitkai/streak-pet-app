"use client";

import { useState } from "react";
import SettingsSheet from "@/components/SettingsSheet";
import { SettingsIcon } from "@/components/icons";

/**
 * Nút Cài đặt đặt ngay trên thanh header của trang Hồ sơ (thay vì trôi nổi
 * riêng một dòng như trước) — bấm vào mở SettingsSheet chứa Đăng xuất.
 */
export default function ProfileHeaderActions() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Cài đặt"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--foreground)] transition active:scale-90 active:bg-black/5"
      >
        <SettingsIcon className="h-5 w-5" />
      </button>
      {open && <SettingsSheet onClose={() => setOpen(false)} />}
    </>
  );
}
