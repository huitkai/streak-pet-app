"use client";

import { useEffect, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { updateCoupleTheme, updateNickname } from "@/lib/actions";
import { decodeMessage } from "@/lib/message-format";
import { THEME_PRESETS, isValidHex, DEFAULT_THEME_COLOR } from "@/lib/theme";
import Avatar from "@/components/Avatar";
import {
  ArrowLeftIcon,
  MoreIcon,
  FlameIcon,
  ImageIcon,
  TrophyIcon,
  BellIcon,
  PinIcon,
  LockIcon,
  ChevronRightIcon,
  PaletteIcon,
  EditIcon,
  CheckIcon,
} from "@/components/icons";

/** "12 tháng 6, 2026" — dùng cho dòng phụ đề dưới tên đối phương. */
function formatJoinDate(iso: string): string {
  return new Date(iso).toLocaleDateString("vi-VN", { day: "2-digit", month: "long", year: "numeric" });
}

export default function ChatSettingsSheet({
  coupleId,
  currentThemeColor,
  currentNickname,
  partnerRealName,
  partnerAvatarUrl,
  nickname,
  statusLabel,
  isPartnerOnline,
  streakCurrent,
  photoCount,
  coupleCreatedAt,
  onClose,
  onThemeChange,
  onNicknameChange,
}: {
  coupleId: string;
  /** Màu hiện tại (đã fallback sẵn về DEFAULT_THEME_COLOR ở nơi gọi nếu null). */
  currentThemeColor: string;
  /** Biệt danh RIÊNG mình đã đặt (chuỗi rỗng = chưa đặt). */
  currentNickname: string;
  /** Tên thật (display_name) của đối phương — hiện làm placeholder cho ô nickname. */
  partnerRealName: string;
  partnerAvatarUrl?: string | null;
  /** Tên hiệu lực đang hiển thị (biệt danh hoặc display_name) cho phần đầu trang. */
  nickname: string;
  /** Chuỗi trạng thái đã format sẵn ("Đang hoạt động" / "Hoạt động 3 phút trước"...). */
  statusLabel: string;
  isPartnerOnline: boolean;
  streakCurrent: number;
  photoCount: number;
  coupleCreatedAt: string;
  onClose: () => void;
  /** Gọi ngay khi lưu màu thành công (optimistic) để ChatHeader/ChatBox áp CSS var mới. */
  onThemeChange: (hex: string) => void;
  /** Gọi ngay khi lưu biệt danh thành công (optimistic). */
  onNicknameChange: (nickname: string) => void;
}) {
  const [color, setColor] = useState(currentThemeColor || DEFAULT_THEME_COLOR);
  const [customHex, setCustomHex] = useState(currentThemeColor || DEFAULT_THEME_COLOR);
  const [nicknameInput, setNicknameInput] = useState(currentNickname);
  const [themeError, setThemeError] = useState<string | null>(null);
  const [nicknameError, setNicknameError] = useState<string | null>(null);
  const [themeSaved, setThemeSaved] = useState(false);
  const [nicknameSaved, setNicknameSaved] = useState(false);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [, startTransition] = useTransition();

  // Ảnh gần đây để hiện trong khối "Ảnh và khoảnh khắc" — chỉ 1 lần khi mở
  // sheet, KHÔNG cần realtime (ảnh cũ không đổi), nên fetch client 1 lần là đủ.
  const [recentPhotos, setRecentPhotos] = useState<string[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    supabase
      .from("messages")
      .select("content")
      .eq("couple_id", coupleId)
      .is("deleted_at", null)
      .or("content.like.::image::%,content.like.::stampphoto::%")
      .order("created_at", { ascending: false })
      .limit(4)
      .then(({ data }) => {
        if (cancelled || !data) return;
        const urls = data
          .map((row) => decodeMessage(row.content))
          .filter((d) => d.type === "image" || d.type === "stamp_photo")
          .map((d) => (d as { url: string }).url);
        setRecentPhotos(urls);
      });
    return () => {
      cancelled = true;
    };
  }, [coupleId]);

  // Toggle UI-only (chưa nối tính năng khoá đoạn chat thật) — chỉ phản hồi
  // thị giác ngay khi bấm, để sau này gắn logic thật vào đây không phải đổi UI.
  const [lockChat, setLockChat] = useState(false);

  function flashSaved(setter: (v: boolean) => void) {
    setter(true);
    window.setTimeout(() => setter(false), 1500);
  }

  function applyColor(hex: string) {
    const prev = color;
    setColor(hex); // optimistic
    setCustomHex(hex);
    setThemeError(null);
    onThemeChange(hex);
    startTransition(async () => {
      const res = await updateCoupleTheme(coupleId, hex);
      if (res?.error) {
        setColor(prev);
        onThemeChange(prev);
        setThemeError(res.error);
      } else {
        flashSaved(setThemeSaved);
      }
    });
  }

  function handleCustomHexSubmit() {
    const hex = customHex.trim();
    if (!isValidHex(hex)) {
      setThemeError("Mã màu không hợp lệ — cần dạng #rrggbb, ví dụ #7c5cff.");
      return;
    }
    applyColor(hex);
  }

  function handleSaveNickname() {
    const trimmed = nicknameInput.trim();
    setNicknameError(null);
    onNicknameChange(trimmed); // optimistic
    startTransition(async () => {
      const res = await updateNickname(coupleId, trimmed || null);
      if (res?.error) {
        setNicknameError(res.error);
      } else {
        flashSaved(setNicknameSaved);
      }
    });
  }

  const extraPhotos = Math.max(0, photoCount - (recentPhotos?.length ?? 0));

  return (
    <div className="fixed inset-0 z-50 flex flex-col app-ambient-bg animate-pop-in">
      {/* ---- Header: back + more, giống mẫu ---- */}
      <header className="safe-top flex shrink-0 items-center justify-between px-3 pb-2">
        <button
          type="button"
          onClick={onClose}
          aria-label="Quay lại"
          className="glass-icon-btn flex h-9 w-9 items-center justify-center rounded-full text-[var(--foreground)] transition active:scale-90"
        >
          <ArrowLeftIcon className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => setCustomizeOpen((v) => !v)}
          aria-label="Tuỳ chỉnh thêm"
          className="glass-icon-btn flex h-9 w-9 items-center justify-center rounded-full text-[var(--foreground)] transition active:scale-90"
        >
          <MoreIcon className="h-5 w-5" />
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-8">
        {/* ---- Avatar + tên + trạng thái, căn giữa giống mẫu ---- */}
        <div className="flex flex-col items-center pt-1 text-center">
          <span className="relative">
            <Avatar url={partnerAvatarUrl} name={nickname || partnerRealName} size={88} ring />
            {isPartnerOnline && (
              <span className="absolute bottom-1 right-1 h-3.5 w-3.5 rounded-full border-2 border-[var(--background)] bg-emerald-400" />
            )}
          </span>
          <h1 className="mt-3 text-xl font-bold text-[var(--foreground)]">{nickname}</h1>
          <p className={`mt-0.5 text-[13px] ${isPartnerOnline ? "font-medium text-emerald-400" : "text-[var(--muted)]"}`}>
            {statusLabel || `Bên nhau từ ${formatJoinDate(coupleCreatedAt)}`}
          </p>
        </div>

        {/* ---- Hàng thống kê (thay cho Message/Group/Spaces trong mẫu) ---- */}
        <div className="mt-5 grid grid-cols-3 gap-2.5">
          <div className="glass-surface flex flex-col items-center gap-1 rounded-2xl py-3">
            <FlameIcon className="h-4 w-4 text-[var(--brand)]" />
            <span className="text-lg font-bold text-[var(--foreground)]">{streakCurrent}</span>
            <span className="text-[10.5px] text-[var(--muted)]">Chuỗi ngày</span>
          </div>
          <div className="glass-surface flex flex-col items-center gap-1 rounded-2xl py-3">
            <ImageIcon className="h-4 w-4 text-[var(--brand)]" />
            <span className="text-lg font-bold text-[var(--foreground)]">{photoCount}</span>
            <span className="text-[10.5px] text-[var(--muted)]">Ảnh đã gửi</span>
          </div>
          <div className="glass-surface flex flex-col items-center gap-1 rounded-2xl py-3">
            <TrophyIcon className="h-4 w-4 text-[var(--brand)]" />
            <span className="text-lg font-bold text-[var(--foreground)]">
              {Math.max(1, Math.floor((Date.now() - new Date(coupleCreatedAt).getTime()) / 86_400_000) + 1)}
            </span>
            <span className="text-[10.5px] text-[var(--muted)]">Ngày bên nhau</span>
          </div>
        </div>

        {/* ---- Ảnh và khoảnh khắc ---- */}
        {(recentPhotos === null || recentPhotos.length > 0) && (
          <section className="mt-5">
            <div className="flex items-center justify-between px-0.5">
              <h2 className="text-[15px] font-semibold text-[var(--foreground)]">Ảnh và khoảnh khắc</h2>
              <ChevronRightIcon className="h-4 w-4 text-[var(--muted)]" />
            </div>
            <div className="glass-surface mt-2 grid grid-cols-4 gap-1 overflow-hidden rounded-2xl p-1">
              {recentPhotos === null
                ? Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="aspect-square animate-shimmer rounded-xl" />
                  ))
                : recentPhotos.map((url, i) => {
                    const isLast = i === recentPhotos.length - 1 && extraPhotos > 0;
                    return (
                      <div key={url + i} className="relative aspect-square overflow-hidden rounded-xl">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt="" className="h-full w-full object-cover" />
                        {isLast && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/55 text-sm font-bold text-white">
                            +{extraPhotos}
                          </div>
                        )}
                      </div>
                    );
                  })}
            </div>
          </section>
        )}

        {/* ---- Danh sách tuỳ chọn, giống mẫu ---- */}
        <section className="glass-surface mt-5 divide-y divide-[var(--border)] overflow-hidden rounded-2xl">
          <SettingsRow icon={<BellIcon className="h-[18px] w-[18px]" />} label="Thông báo" />
          <SettingsRow icon={<ImageIcon className="h-[18px] w-[18px]" />} label="Hiển thị media" />
          <SettingsRow icon={<PinIcon className="h-[18px] w-[18px]" />} label="Tin nhắn đã ghim" />
          <SettingsRow
            icon={<LockIcon className="h-[18px] w-[18px]" />}
            label="Khoá đoạn chat"
            toggle
            checked={lockChat}
            onToggle={() => setLockChat((v) => !v)}
          />
        </section>

        {/* ---- Tuỳ chỉnh nâng cao (màu chủ đề + biệt danh) — bấm nút "..." ở
             header để mở, giữ nguyên tính năng cũ nhưng gọn lại phía dưới. ---- */}
        {customizeOpen && (
          <section className="glass-surface mt-5 rounded-2xl p-4">
            <p className="flex items-center gap-1.5 px-0.5 text-[11px] font-semibold text-[var(--muted)]">
              <PaletteIcon className="h-3.5 w-3.5" /> Màu chủ đề
            </p>
            <div className="mt-2 grid grid-cols-4 gap-2.5">
              {THEME_PRESETS.map((preset) => {
                const selected = preset.hex.toLowerCase() === color.toLowerCase();
                return (
                  <button
                    key={preset.hex}
                    type="button"
                    onClick={() => applyColor(preset.hex)}
                    aria-label={preset.label}
                    className={`relative flex flex-col items-center gap-1 rounded-xl py-2.5 transition active:scale-95 ${
                      selected ? "bg-white/10 ring-2 ring-offset-1 ring-offset-[var(--surface)]" : ""
                    }`}
                    style={selected ? ({ ["--tw-ring-color" as string]: preset.hex } as never) : undefined}
                  >
                    <span
                      className="flex h-8 w-8 items-center justify-center rounded-full shadow-sm"
                      style={{ background: preset.hex }}
                    >
                      {selected && <CheckIcon className="h-4 w-4 text-white" strokeWidth={2.5} />}
                    </span>
                    <span className="text-[9px] font-medium leading-tight text-[var(--foreground)]">
                      {preset.label}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="mt-3 flex items-center gap-2">
              <span
                className="h-8 w-8 shrink-0 rounded-full border border-black/10 shadow-sm"
                style={{ background: isValidHex(customHex) ? customHex : "transparent" }}
                aria-hidden
              />
              <input
                type="text"
                value={customHex}
                onChange={(e) => setCustomHex(e.target.value)}
                placeholder="#rrggbb"
                maxLength={7}
                className="min-w-0 flex-1 rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm font-medium tracking-wide text-[var(--foreground)] outline-none focus:border-[var(--brand)]"
              />
              <button
                type="button"
                onClick={handleCustomHexSubmit}
                className="shrink-0 rounded-xl bg-[var(--brand)] px-3.5 py-2 text-sm font-semibold text-white transition active:scale-95"
              >
                Áp dụng
              </button>
            </div>
            {themeError && <p className="mt-1.5 px-0.5 text-[11px] text-red-500">{themeError}</p>}
            {themeSaved && !themeError && (
              <p className="mt-1.5 flex items-center gap-1 px-0.5 text-[11px] font-medium text-green-600">
                <CheckIcon className="h-3 w-3" /> Đã lưu màu chủ đề
              </p>
            )}

            <p className="mt-5 flex items-center gap-1.5 px-0.5 text-[11px] font-semibold text-[var(--muted)]">
              <EditIcon className="h-3.5 w-3.5" /> Biệt danh cho {partnerRealName || "đối phương"}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <input
                type="text"
                value={nicknameInput}
                onChange={(e) => setNicknameInput(e.target.value)}
                placeholder={partnerRealName || "Người ấy"}
                maxLength={40}
                className="min-w-0 flex-1 rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--brand)]"
              />
              <button
                type="button"
                onClick={handleSaveNickname}
                className="shrink-0 rounded-xl bg-[var(--brand)] px-3.5 py-2 text-sm font-semibold text-white transition active:scale-95"
              >
                Lưu
              </button>
            </div>
            <p className="mt-1.5 px-0.5 text-[11px] text-[var(--muted)]">
              Chỉ mình bạn thấy biệt danh này — để trống để dùng lại tên gốc.
            </p>
            {nicknameError && <p className="mt-1 px-0.5 text-[11px] text-red-500">{nicknameError}</p>}
            {nicknameSaved && !nicknameError && (
              <p className="mt-1 flex items-center gap-1 px-0.5 text-[11px] font-medium text-green-600">
                <CheckIcon className="h-3 w-3" /> Đã lưu biệt danh
              </p>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

/** 1 hàng trong danh sách tuỳ chọn — có thể là hàng điều hướng (chevron) hoặc
 * hàng bật/tắt (toggle switch), tái dùng chung 1 layout cho cả 2 kiểu. */
function SettingsRow({
  icon,
  label,
  toggle = false,
  checked = false,
  onToggle,
}: {
  icon: React.ReactNode;
  label: string;
  toggle?: boolean;
  checked?: boolean;
  onToggle?: () => void;
}) {
  const content = (
    <>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center text-[var(--brand)]">{icon}</span>
      <span className="flex-1 text-left text-[14.5px] font-medium text-[var(--foreground)]">{label}</span>
      {toggle ? (
        <span
          className={`relative h-6 w-10 shrink-0 rounded-full transition-colors ${
            checked ? "bg-[var(--brand)]" : "bg-white/15"
          }`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
              checked ? "translate-x-[18px]" : "translate-x-0.5"
            }`}
          />
        </span>
      ) : (
        <ChevronRightIcon className="h-4 w-4 shrink-0 text-[var(--muted)]" />
      )}
    </>
  );

  if (toggle) {
    return (
      <button type="button" onClick={onToggle} className="flex w-full items-center gap-3 px-4 py-3 transition active:bg-white/5">
        {content}
      </button>
    );
  }
  return (
    <button type="button" className="flex w-full items-center gap-3 px-4 py-3 transition active:bg-white/5">
      {content}
    </button>
  );
}
