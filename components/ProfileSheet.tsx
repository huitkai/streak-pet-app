"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { updateProfile } from "@/lib/actions";
import Avatar from "@/components/Avatar";
import { XIcon, CameraIcon } from "@/components/icons";
import type { ProfileRow } from "@/lib/types";

export default function ProfileSheet({
  userId,
  profile,
  onClose,
  onUpdated,
}: {
  userId: string;
  profile: ProfileRow | null;
  onClose: () => void;
  onUpdated: (p: Partial<ProfileRow>) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url ?? null);
  const [name, setName] = useState(profile?.display_name ?? "");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      // cache-bust để ảnh mới hiện ngay dù cùng tên file
      const finalUrl = `${pub.publicUrl}?t=${Date.now()}`;

      setAvatarUrl(finalUrl);
      const res = await updateProfile({ avatar_url: finalUrl });
      if (res?.error) throw new Error(res.error);
      onUpdated({ avatar_url: finalUrl });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tải ảnh thất bại.");
    } finally {
      setUploading(false);
    }
  }

  async function handleSaveName() {
    setSaving(true);
    setError(null);
    const res = await updateProfile({ display_name: name.trim() || undefined });
    setSaving(false);
    if (res?.error) {
      setError(res.error);
      return;
    }
    onUpdated({ display_name: name.trim() });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/35 animate-pop-in" onClick={onClose} aria-hidden />
      <div className="safe-bottom animate-sheet-up relative w-full max-w-md rounded-t-3xl bg-[var(--surface)] p-5 shadow-xl">
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng"
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-black/5 text-[var(--muted)]"
        >
          <XIcon className="h-4 w-4" />
        </button>

        <h2 className="mb-4 text-lg font-bold text-[var(--foreground)]">Hồ sơ của bạn</h2>

        <div className="flex flex-col items-center">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="relative active:scale-95"
            aria-label="Đổi ảnh đại diện"
          >
            <Avatar url={avatarUrl} name={name || "?"} size={92} />
            <span className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full bg-[var(--brand)] text-white ring-2 ring-[var(--surface)]">
              <CameraIcon className="h-3.5 w-3.5" />
            </span>
            {uploading && (
              <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 text-[11px] text-white">
                Đang tải...
              </span>
            )}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFile}
          />

          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Tên hiển thị"
            maxLength={30}
            className="mt-4 w-full max-w-[220px] rounded-xl border border-[var(--border)] px-3 py-2 text-center text-sm outline-none focus:border-[var(--brand)]"
          />
        </div>

        {error && <p className="mt-3 text-center text-sm text-red-500">{error}</p>}

        <button
          type="button"
          onClick={handleSaveName}
          disabled={saving}
          className="mt-5 w-full rounded-xl bg-[var(--brand)] py-2.5 font-medium text-white transition hover:bg-[var(--brand-dark)] disabled:opacity-60"
        >
          Lưu
        </button>
      </div>
    </div>
  );
}
