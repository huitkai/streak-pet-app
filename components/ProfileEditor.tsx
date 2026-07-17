"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { updateProfile } from "@/lib/actions";
import { CameraIcon, FlameIcon, ImageIcon, SparkleIcon } from "@/components/icons";
import type { ProfileRow } from "@/lib/types";

export interface ProfileStatItem {
  icon: "flame" | "calendar" | "image" | "stage";
  value: number | string;
  label: string;
}

export interface ProfileTagItem {
  emoji?: string;
  label: string;
}

function StatIcon({ icon }: { icon: ProfileStatItem["icon"] }) {
  if (icon === "flame") return <FlameIcon className="h-4 w-4 text-orange-200" />;
  if (icon === "image") return <ImageIcon className="h-4 w-4 text-white/85" />;
  if (icon === "stage") return <SparkleIcon className="h-4 w-4 text-white/85" />;
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-white/85">
      <rect x="3" y="4" width="18" height="17" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M3 9h18M8 2v4M16 2v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

/** Dải card thống kê — mỗi chỉ số là MỘT card kính riêng biệt (không còn chung
 * khung), có thể cuộn ngang, đúng tinh thần khối "Sessions / Age / Videos"
 * trong mẫu tham khảo thay vì một hàng chia cột đơn điệu như trước. */
export function GlassStatCards({ stats }: { stats: ProfileStatItem[] }) {
  if (stats.length === 0) return null;
  return (
    <div className="scrollbar-none -mx-5 flex w-[calc(100%+2.5rem)] gap-2.5 overflow-x-auto px-5 pb-1">
      {stats.map((s, i) => (
        <div
          key={i}
          className="flex min-w-[92px] shrink-0 flex-col items-center gap-1.5 rounded-[22px] border border-white/20 bg-white/12 px-4 py-3.5 text-white shadow-[0_8px_24px_-8px_rgba(0,0,0,0.35)] backdrop-blur-xl"
        >
          <div className="flex items-center gap-1.5">
            <StatIcon icon={s.icon} />
            <span className="text-base font-bold leading-none">
              {typeof s.value === "number" ? s.value.toLocaleString("vi-VN") : s.value}
            </span>
          </div>
          <span className="text-[11px] font-medium text-white/75">{s.label}</span>
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
          className="rounded-full border border-white/25 bg-white/12 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm backdrop-blur-xl"
        >
          {t.emoji ? `${t.emoji} ` : ""}
          {t.label}
        </span>
      ))}
    </div>
  );
}

/** Dòng số liệu nổi bật phía trên tên, cùng nhịp với "24.978 Followers" trong
 * mẫu — một con số lớn đi kèm nhãn nhỏ, kể câu chuyện quan trọng nhất trước
 * khi người xem đọc tới tên. */
export function HeroEyebrow({ value, label }: { value: number | string; label: string }) {
  return (
    <p className="flex items-baseline gap-1.5 text-white/90 drop-shadow-sm">
      <span className="text-xl font-bold">{typeof value === "number" ? value.toLocaleString("vi-VN") : value}</span>
      <span className="text-[13px] font-medium text-white/70">{label}</span>
    </p>
  );
}

/** Huy hiệu tròn nhỏ đè lên mép dưới ảnh nền — tương đương chiếc icon hoa có
 * sparkle trong mẫu tham khảo. Với chủ tài khoản đây cũng là nút đổi ảnh. */
export function HeroBadge({
  children,
  onClick,
  label,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  label?: string;
}) {
  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      type={onClick ? "button" : undefined}
      onClick={onClick}
      aria-label={label}
      className="relative flex h-14 w-14 items-center justify-center rounded-full border-2 border-white/70 bg-gradient-to-br from-white/40 to-white/10 text-white shadow-lg backdrop-blur-md transition active:scale-90"
    >
      {children}
    </Comp>
  );
}

/** Nền hero full-bleed: ảnh bìa/avatar mờ dần (mask fade) hoà vào gradient
 * xanh→hồng thương hiệu phía dưới, giống hiệu ứng ảnh mờ→màu trong mẫu tham
 * khảo, và trải dài hết vùng tên/tag/thống kê chứ không dừng lại ở mép ảnh. */
export function HeroBackground({ imageUrl }: { imageUrl: string | null }) {
  return (
    // z-0 (không phải -z-10): container cha chỉ có `relative` chứ không tự
    // tạo stacking context mới, nên z-index ÂM từng khiến lớp nền này bị
    // "chìm" xuống dưới cả nền trắng hồng của toàn bộ trang — kết quả là
    // chỉ còn chữ trắng mờ trên nền hồng nhạt, trông như bị vỡ giao diện.
    // Container cha (bên dưới) đã thêm `isolate` để đảm bảo z-0 ở đây luôn
    // là lớp thấp nhất RIÊNG trong phạm vi hero, không ảnh hưởng ra ngoài.
    <div className="absolute inset-0 z-0 overflow-hidden bg-gradient-to-b from-[#6f8fd6] via-[var(--brand)] to-[var(--brand-dark)]">
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt=""
          className="absolute inset-x-0 top-0 h-[62%] w-full object-cover opacity-95"
          style={{
            maskImage: "linear-gradient(to bottom, black 30%, transparent 88%)",
            WebkitMaskImage: "linear-gradient(to bottom, black 30%, transparent 88%)",
          }}
        />
      ) : (
        // Chưa có ảnh: thay vì một khối màu phẳng (nhìn như hình vẽ trẻ
        // con), phủ thêm vài quầng sáng mờ + noise nhẹ để có chiều sâu,
        // gần với cảm giác "biên tập/editorial" của ảnh mẫu hơn.
        <div className="absolute inset-0 h-[62%] w-full overflow-hidden">
          <div className="absolute -left-10 -top-16 h-64 w-64 rounded-full bg-white/25 blur-3xl" />
          <div className="absolute -right-16 top-10 h-72 w-72 rounded-full bg-[#ffd7e8]/30 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 h-56 w-56 rounded-full bg-[#4a5fb0]/30 blur-3xl" />
          <div
            className="absolute inset-0 opacity-[0.08] mix-blend-overlay"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
            }}
          />
        </div>
      )}
      <div className="absolute inset-0 bg-black/10" />
    </div>
  );
}

/** Quầng sáng nền mờ đặt phía sau các card kính bên dưới hero — nếu không có
 * gì màu ở phía sau, backdrop-blur trên nền trắng trơn sẽ vô nghĩa (kính
 * trong suốt nhưng chẳng có gì để "mượn" mà tạo chiều sâu). Dùng `isolate`
 * + z-index dương (không âm) để tránh lặp lại đúng lỗi stacking context đã
 * gặp ở HeroBackground. */
export function AmbientGlow({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative isolate">
      <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div className="absolute -left-14 top-2 h-52 w-52 rounded-full bg-[var(--brand)]/20 blur-3xl" />
        <div className="absolute -right-10 top-20 h-60 w-60 rounded-full bg-[#6f8fd6]/18 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-48 w-48 rounded-full bg-[var(--brand-dark)]/14 blur-3xl" />
      </div>
      {children}
    </div>
  );
}

export default function ProfileEditor({
  userId,
  profile,
  stats,
  tags,
  eyebrow,
}: {
  userId: string;
  profile: ProfileRow | null;
  stats: ProfileStatItem[];
  tags: ProfileTagItem[];
  eyebrow?: { value: number | string; label: string } | null;
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
    <div className="relative isolate flex min-h-[600px] flex-col items-center overflow-hidden pb-8 pt-24">
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

      <div className="flex flex-1 flex-col items-center justify-end px-5 pt-40">
        <button type="button" onClick={() => fileRef.current?.click()} aria-label="Đổi ảnh đại diện">
          <HeroBadge>
            {uploading ? (
              <span className="text-[9px] font-semibold">...</span>
            ) : (
              <CameraIcon className="h-5 w-5" />
            )}
          </HeroBadge>
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />

        {eyebrow && (
          <div className="mt-3">
            <HeroEyebrow value={eyebrow.value} label={eyebrow.label} />
          </div>
        )}

        <div className="mt-1.5 flex flex-col items-center">
          <p className="text-[26px] font-bold leading-tight text-white drop-shadow-sm">
            {name || "Chưa đặt tên"}
          </p>
          {saved && <p className="mt-1 text-xs font-medium text-emerald-200">Đã lưu thay đổi ✓</p>}
        </div>

        <div className="mt-3">
          <GlassTagRow tags={tags} />
        </div>

        {!editing ? (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="mt-4 w-full max-w-xs rounded-full border border-white/25 bg-white/12 py-2.5 text-sm font-semibold text-white shadow-sm backdrop-blur-xl transition active:scale-[0.98] active:bg-white/20"
          >
            Chỉnh sửa trang cá nhân
          </button>
        ) : (
          <div className="mt-4 w-full max-w-xs rounded-2xl border border-white/20 bg-white/12 p-3 backdrop-blur-xl">
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

        {stats.length > 0 && (
          <div className="mt-7 w-full max-w-sm">
            <p className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-white/60">
              Thống kê
            </p>
            <GlassStatCards stats={stats} />
          </div>
        )}
      </div>
    </div>
  );
}
