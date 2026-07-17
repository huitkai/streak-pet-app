"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { updateProfile } from "@/lib/actions";
import Avatar from "@/components/Avatar";
import { CameraIcon, FlameIcon, ImageIcon } from "@/components/icons";
import type { ProfileRow } from "@/lib/types";

export interface ProfileStatItem {
  icon: "flame" | "calendar" | "image";
  value: number;
  label: string;
}

export interface ProfileTagItem {
  emoji?: string;
  label: string;
}

function StatIcon({ icon }: { icon: ProfileStatItem["icon"] }) {
  if (icon === "flame") return <FlameIcon className="h-4 w-4 text-orange-300" />;
  if (icon === "image") return <ImageIcon className="h-4 w-4 text-white/80" />;
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-white/80">
      <rect x="3" y="4" width="18" height="17" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M3 9h18M8 2v4M16 2v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export default function ProfileEditor({
  userId,
  profile,
  stats,
  tags,
}: {
  userId: string;
  profile: ProfileRow | null;
  stats: ProfileStatItem[];
  tags: ProfileTagItem[];
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const bannerRef = useRef<HTMLInputElement>(null);
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url ?? null);
  const [bannerUrl, setBannerUrl] = useState(profile?.banner_url ?? null);
  const [name, setName] = useState(profile?.display_name ?? "");
  const [uploading, setUploading] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [editing, setEditing] = useState(false);

  async function uploadTo(file: File, kind: "avatar" | "banner") {
    const supabase = createClient();
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${userId}/${kind}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true, cacheControl: "3600" });
    if (upErr) throw upErr;
    const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
    return `${pub.publicUrl}?t=${Date.now()}`;
  }

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
      const finalUrl = await uploadTo(file, "avatar");
      setAvatarUrl(finalUrl);
      const res = await updateProfile({ avatar_url: finalUrl });
      if (res?.error) throw new Error(res.error);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tải ảnh thất bại.");
    } finally {
      setUploading(false);
    }
  }

  async function handleBannerFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Vui lòng chọn một file ảnh.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError("Ảnh bìa tối đa 8MB nhé.");
      return;
    }

    setUploadingBanner(true);
    setError(null);
    try {
      const finalUrl = await uploadTo(file, "banner");
      setBannerUrl(finalUrl);
      const res = await updateProfile({ banner_url: finalUrl });
      if (res?.error) throw new Error(res.error);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tải ảnh bìa thất bại.");
    } finally {
      setUploadingBanner(false);
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
      {/* ---- Banner ---- */}
      <button
        type="button"
        onClick={() => bannerRef.current?.click()}
        aria-label="Đổi ảnh bìa"
        className="relative block h-56 w-full overflow-hidden bg-gradient-to-br from-[var(--brand-light)] via-[#ffc2d6] to-[var(--brand)]"
      >
        {bannerUrl ? (
          <img src={bannerUrl} alt="Ảnh bìa" className="h-full w-full object-cover" />
        ) : avatarUrl ? (
          <img
            src={avatarUrl}
            alt=""
            className="h-full w-full scale-125 object-cover opacity-70 blur-2xl"
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-black/25" />
        <span className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-sm transition active:scale-90">
          <CameraIcon className="h-4.5 w-4.5" />
        </span>
        {uploadingBanner && (
          <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-xs font-medium text-white">
            Đang tải ảnh bìa...
          </span>
        )}
      </button>
      <input ref={bannerRef} type="file" accept="image/*" className="hidden" onChange={handleBannerFile} />

      <div className="-mt-12 flex flex-col items-center px-4 pb-2">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="relative active:scale-95"
          aria-label="Đổi ảnh đại diện"
        >
          <div className="rounded-full ring-4 ring-[var(--background)]">
            <Avatar url={avatarUrl} name={name || "?"} size={96} />
          </div>
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

        {tags.length > 0 && (
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {tags.map((t, i) => (
              <span
                key={i}
                className="rounded-full bg-[var(--brand-light)] px-3 py-1 text-xs font-semibold text-[var(--brand-dark)]"
              >
                {t.emoji ? `${t.emoji} ` : ""}
                {t.label}
              </span>
            ))}
          </div>
        )}

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

        {/* ---- Stats row ---- */}
        {stats.length > 0 && (
          <div className="mt-5 grid w-full max-w-sm grid-cols-3 gap-2">
            {stats.map((s, i) => (
              <div
                key={i}
                className="flex flex-col items-center gap-1 rounded-2xl bg-[var(--brand)]/95 px-2 py-3 text-white shadow-sm"
              >
                <div className="flex items-center gap-1">
                  <StatIcon icon={s.icon} />
                  <span className="text-base font-bold leading-none">{s.value}</span>
                </div>
                <span className="text-[11px] font-medium text-white/85">{s.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
