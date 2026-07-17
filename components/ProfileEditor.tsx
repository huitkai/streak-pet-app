"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { updateProfile } from "@/lib/actions";
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
  if (icon === "flame") return <FlameIcon className="h-4 w-4 text-orange-200" />;
  if (icon === "image") return <ImageIcon className="h-4 w-4 text-white/85" />;
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-white/85">
      <rect x="3" y="4" width="18" height="17" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M3 9h18M8 2v4M16 2v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function GlassStatRow({ stats }: { stats: ProfileStatItem[] }) {
  if (stats.length === 0) return null;
  return (
    <div className="grid w-full max-w-sm grid-cols-3 gap-2 rounded-3xl border border-white/25 bg-white/10 p-2 shadow-lg backdrop-blur-xl">
      {stats.map((s, i) => (
        <div key={i} className="flex flex-col items-center gap-1 rounded-2xl px-2 py-3 text-white">
          <div className="flex items-center gap-1.5">
            <StatIcon icon={s.icon} />
            <span className="text-base font-bold leading-none">{s.value.toLocaleString("vi-VN")}</span>
          </div>
          <span className="text-[11px] font-medium text-white/80">{s.label}</span>
        </div>
      ))}
    </div>
  );
}

export function GlassTagRow({ tags }: { tags: ProfileTagItem[] }) {
  if (tags.length === 0) return null;
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {tags.map((t, i) => (
        <span
          key={i}
          className="rounded-full border border-white/25 bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white backdrop-blur-xl"
        >
          {t.emoji ? `${t.emoji} ` : ""}
          {t.label}
        </span>
      ))}
    </div>
  );
}

/** Nền hero full-bleed: ảnh bìa/avatar mờ dần (mask fade) hoà vào gradient
 * thương hiệu phía dưới, giống hiệu ứng ảnh mờ→màu trong mẫu tham khảo. */
export function HeroBackground({ imageUrl }: { imageUrl: string | null }) {
  return (
    <div className="absolute inset-0 -z-10 overflow-hidden bg-gradient-to-b from-[#6f8fd6] via-[var(--brand)] to-[var(--brand-dark)]">
      {imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt=""
          className="absolute inset-x-0 top-0 h-[70%] w-full object-cover opacity-95"
          style={{
            maskImage: "linear-gradient(to bottom, black 35%, transparent 92%)",
            WebkitMaskImage: "linear-gradient(to bottom, black 35%, transparent 92%)",
          }}
        />
      )}
      <div className="absolute inset-0 bg-black/10" />
    </div>
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
    <div className="relative flex min-h-[640px] flex-col items-center overflow-hidden pb-8 pt-24">
      <HeroBackground imageUrl={bannerUrl || avatarUrl} />

      {/* Nút đổi ảnh bìa, đặt kín đáo góc phải để không đè lên avatar/tên */}
      <button
        type="button"
        onClick={() => bannerRef.current?.click()}
        aria-label="Đổi ảnh bìa"
        className="absolute right-3 top-[4.25rem] flex h-9 w-9 items-center justify-center rounded-full border border-white/25 bg-white/15 text-white backdrop-blur-md transition active:scale-90 active:bg-white/25"
      >
        <CameraIcon className="h-4 w-4" />
      </button>
      <input ref={bannerRef} type="file" accept="image/*" className="hidden" onChange={handleBannerFile} />
      {uploadingBanner && (
        <span className="absolute right-14 top-[4.6rem] rounded-full bg-black/40 px-2.5 py-1 text-[11px] text-white backdrop-blur-md">
          Đang tải ảnh bìa...
        </span>
      )}

      <div className="flex flex-col items-center px-5">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="relative active:scale-95"
          aria-label="Đổi ảnh đại diện"
        >
          <div className="h-20 w-20 overflow-hidden rounded-full border-2 border-white/60 bg-white/10 shadow-lg backdrop-blur-md">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt={name || "avatar"} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-2xl font-semibold text-white">
                {(name?.trim()?.[0] ?? "?").toUpperCase()}
              </div>
            )}
          </div>
          <span className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full border border-white/40 bg-black/40 text-white backdrop-blur-md">
            <CameraIcon className="h-3.5 w-3.5" />
          </span>
          {uploading && (
            <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 text-[10px] text-white">
              Đang tải...
            </span>
          )}
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />

        <div className="mt-3 flex flex-col items-center">
          <p className="text-2xl font-bold text-white drop-shadow-sm">{name || "Chưa đặt tên"}</p>
          {saved && <p className="mt-1 text-xs font-medium text-emerald-200">Đã lưu thay đổi ✓</p>}
        </div>

        <div className="mt-3">
          <GlassTagRow tags={tags} />
        </div>

        {!editing ? (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="mt-4 w-full max-w-xs rounded-full border border-white/25 bg-white/10 py-2.5 text-sm font-semibold text-white shadow-sm backdrop-blur-xl transition active:scale-[0.98] active:bg-white/20"
          >
            Chỉnh sửa trang cá nhân
          </button>
        ) : (
          <div className="mt-4 w-full max-w-xs rounded-2xl border border-white/20 bg-white/10 p-3 backdrop-blur-xl">
            <label className="mb-1 block text-xs font-medium text-white/70">Tên hiển thị</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tên hiển thị"
              maxLength={30}
              autoFocus
              className="w-full rounded-xl border border-white/25 bg-white/10 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/50 focus:border-white/60"
            />

            {error && <p className="mt-2 text-sm text-red-100">{error}</p>}

            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setName(profile?.display_name ?? "");
                  setError(null);
                }}
                className="flex-1 rounded-xl border border-white/25 py-2.5 text-sm font-medium text-white transition active:bg-white/10"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSaveName}
                disabled={saving}
                className="flex-1 rounded-xl bg-white py-2.5 text-sm font-semibold text-[var(--brand-dark)] transition active:scale-[0.98] disabled:opacity-60"
              >
                {saving ? "Đang lưu..." : "Lưu"}
              </button>
            </div>
          </div>
        )}

        <div className="mt-6 w-full">
          <GlassStatRow stats={stats} />
        </div>
      </div>
    </div>
  );
}
