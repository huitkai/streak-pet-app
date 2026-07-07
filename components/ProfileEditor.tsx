"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { updateProfile } from "@/lib/actions";
import Avatar from "@/components/Avatar";
import SettingsSheet from "@/components/SettingsSheet";
import { CameraIcon, SettingsIcon } from "@/components/icons";
import type { ProfileRow } from "@/lib/types";

export default function ProfileEditor({
  userId,
  profile,
}: {
  userId: string;
  profile: ProfileRow | null;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url ?? null);
  const [name, setName] = useState(profile?.display_name ?? "");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [editing, setEditing] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Vui lòng chọn một file ảnh.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Ảnh tối đa 5MB nhé.");
      return;
    }

    setUploading(true);
    setError(null);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${userId}/avatar.${ext}`;

      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, cacheControl: "3600" });
      if (upErr) throw upErr;

      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
      const finalUrl = `${pub.publicUrl}?t=${Date.now()}`;

      setAvatarUrl(finalUrl);
      const res = await updateProfile({ avatar_url: finalUrl });
      if (res?.error) throw new Error(res.error);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tải ảnh thất bại.");
    } finally {
      setUploading(false);
    }
  }

  async function handleSaveName() {
    setSaving(true);
    setError(null);
    setSaved(false);
    const res = await updateProfile({ display_name: name.trim() || undefined });
    setSaving(false);
    if (res?.error) {
      setError(res.error);
      return;
    }
    setSaved(true);
    setEditing(false);
    window.setTimeout(() => setSaved(false), 1800);
  }

  return (
    <div className="flex flex-col">
      {/* Nút Cài đặt — nơi chứa Đăng xuất, thay vì để nút đăng xuất trôi nổi ở màn hình chính */}
      <div className="flex justify-end px-4 pt-3">
        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          aria-label="Cài đặt"
          className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--foreground)] transition active:scale-90 active:bg-black/5"
        >
          <SettingsIcon className="h-5 w-5" />
        </button>
      </div>

      <div className="flex flex-col items-center px-4 pb-2 pt-1">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="relative active:scale-95"
          aria-label="Đổi ảnh đại diện"
        >
          <Avatar url={avatarUrl} name={name || "?"} size={104} />
          <span className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-[var(--brand)] text-white ring-2 ring-[var(--background)]">
            <CameraIcon className="h-4 w-4" />
          </span>
          {uploading && (
            <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 text-[11px] text-white">
              Đang tải...
            </span>
          )}
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />

        <div className="mt-3 flex flex-col items-center">
          <p className="text-lg font-bold text-[var(--foreground)]">{name || "Chưa đặt tên"}</p>
          {saved && <p className="mt-1 text-xs font-medium text-emerald-600">Đã lưu thay đổi ✓</p>}
        </div>

        {!editing ? (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="mt-4 w-full max-w-xs rounded-xl border border-[var(--border)] bg-[var(--surface)] py-2.5 text-sm font-semibold text-[var(--foreground)] shadow-sm transition active:scale-[0.98] active:bg-black/5"
          >
            Chỉnh sửa trang cá nhân
          </button>
        ) : (
          <div className="mt-4 w-full max-w-xs">
            <label className="mb-1 block text-xs font-medium text-[var(--muted)]">Tên hiển thị</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tên hiển thị"
              maxLength={30}
              autoFocus
              className="w-full rounded-xl border border-[var(--border)] px-3 py-2.5 text-sm outline-none focus:border-[var(--brand)]"
            />

            {error && <p className="mt-2 text-sm text-red-500">{error}</p>}

            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setName(profile?.display_name ?? "");
                  setError(null);
                }}
                className="flex-1 rounded-xl border border-[var(--border)] py-2.5 text-sm font-medium text-[var(--foreground)] transition active:bg-black/5"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSaveName}
                disabled={saving}
                className="flex-1 rounded-xl bg-[var(--brand)] py-2.5 text-sm font-medium text-white transition hover:bg-[var(--brand-dark)] disabled:opacity-60"
              >
                {saving ? "Đang lưu..." : "Lưu"}
              </button>
            </div>
          </div>
        )}
      </div>

      {settingsOpen && <SettingsSheet onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}
