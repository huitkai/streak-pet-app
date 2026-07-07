"use client";

import { useState, useTransition } from "react";
import { updateCoupleTheme, updateNickname } from "@/lib/actions";
import { THEME_PRESETS, isValidHex, DEFAULT_THEME_COLOR } from "@/lib/theme";
import { PaletteIcon, EditIcon, XIcon, CheckIcon } from "@/components/icons";

export default function ChatSettingsSheet({
  coupleId,
  currentThemeColor,
  currentNickname,
  partnerRealName,
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
  onClose: () => void;
  /** Gọi ngay khi lưu màu thành công (optimistic) để ChatHeader/ChatBox áp CSS var mới. */
  onThemeChange: (hex: string) => void;
  /** Gọi ngay khi lưu biệt danh thành công (optimistic). */
  onNicknameChange: (nickname: string) => void;
}) {
  const [color, setColor] = useState(currentThemeColor || DEFAULT_THEME_COLOR);
  const [customHex, setCustomHex] = useState(currentThemeColor || DEFAULT_THEME_COLOR);
  const [nickname, setNickname] = useState(currentNickname);
  const [themeError, setThemeError] = useState<string | null>(null);
  const [nicknameError, setNicknameError] = useState<string | null>(null);
  const [themeSaved, setThemeSaved] = useState(false);
  const [nicknameSaved, setNicknameSaved] = useState(false);
  const [, startTransition] = useTransition();

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
    const trimmed = nickname.trim();
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

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/35 animate-pop-in" onClick={onClose} aria-hidden />
      <div className="safe-bottom animate-sheet-up relative w-full max-w-md rounded-t-3xl bg-[var(--surface)] p-5 shadow-xl max-h-[88vh] overflow-y-auto">
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng"
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-black/5 text-[var(--muted)]"
        >
          <XIcon className="h-4 w-4" />
        </button>

        <h2 className="pr-10 text-lg font-bold text-[var(--foreground)]">Tuỳ chỉnh đoạn chat</h2>
        <p className="mt-0.5 text-xs text-[var(--muted)]">
          Thay đổi ở đây chỉ áp dụng cho cuộc trò chuyện này.
        </p>

        {/* ---- Màu chủ đề ---- */}
        <section className="mt-5">
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
                    selected ? "bg-black/5 ring-2 ring-offset-1" : ""
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
        </section>

        {/* ---- Biệt danh ---- */}
        <section className="mt-6">
          <p className="flex items-center gap-1.5 px-0.5 text-[11px] font-semibold text-[var(--muted)]">
            <EditIcon className="h-3.5 w-3.5" /> Biệt danh cho {partnerRealName || "đối phương"}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
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
      </div>
    </div>
  );
}
