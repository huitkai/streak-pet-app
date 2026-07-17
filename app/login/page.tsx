"use client";

import { useState, useTransition, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { signIn } from "@/lib/actions";
import { MailIcon, LockIcon, EyeIcon, EyeOffIcon, AlertCircleIcon, CheckIcon } from "@/components/icons";

function LoginNotice() {
  const params = useSearchParams();
  const confirmed = params.get("confirmed") === "1";
  const errorParam = params.get("error");

  if (confirmed) {
    return (
      <div className="mb-5 flex items-start gap-2.5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
        <CheckIcon className="mt-0.5 h-4 w-4 shrink-0" />
        <span>Email đã được xác nhận thành công. Hãy đăng nhập để tiếp tục.</span>
      </div>
    );
  }
  if (errorParam) {
    return (
      <div className="mb-5 flex items-start gap-2.5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
        <AlertCircleIcon className="mt-0.5 h-4 w-4 shrink-0" />
        <span>{errorParam}</span>
      </div>
    );
  }
  return null;
}

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [showPassword, setShowPassword] = useState(false);

  // Dùng useTransition thay vì useState thủ công: isPending được React bật
  // lên NGAY khi bấm nút (đồng bộ), không phải đợi hàm async bên trong chạy
  // xong mới vẽ lại UI — nên spinner/disable hiện tức thì, không còn cảm
  // giác "bấm không có phản hồi" trong lúc chờ mạng.
  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await signIn(formData);
      if (res?.error) setError(res.error);
    });
  }

  return (
    <div className="safe-top safe-bottom flex flex-1 items-center justify-center overflow-y-auto px-4 py-8">
      <div className="w-full max-w-sm">
        {/* Thương hiệu */}
        <div className="mb-7 flex flex-col items-center text-center">
          <div className="gradient-brand mb-3 flex h-16 w-16 items-center justify-center overflow-hidden rounded-[22px] p-[2px] shadow-float">
            <Image src="/icons/icon-192.png" alt="Streak & Pet" width={64} height={64} className="h-full w-full rounded-[19px] object-cover" priority />
          </div>
          <h1 className="gradient-text text-2xl font-extrabold tracking-tight">Streak & Pet</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">Chat mỗi ngày, giữ chuỗi, nuôi lớn thú cưng của hai bạn</p>
        </div>

        <div className="glass-surface-strong rounded-3xl border p-7 shadow-glass">
          <h2 className="mb-1 text-lg font-semibold text-[var(--foreground)]">Đăng nhập</h2>
          <p className="mb-5 text-sm text-[var(--muted)]">Chào mừng bạn quay lại</p>

          <Suspense fallback={null}>
            <LoginNotice />
          </Suspense>

          <form action={handleSubmit}>
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">
              Email
            </label>
            <div className="relative mb-4">
              <MailIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="ban@email.com"
                required
                className="w-full rounded-xl border border-[var(--border)] bg-white py-2.5 pl-10 pr-3 text-[15px] outline-none transition focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand-light)]"
              />
            </div>

            <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">
              Mật khẩu
            </label>
            <div className="relative mb-2">
              <LockIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="••••••••"
                required
                className="w-full rounded-xl border border-[var(--border)] bg-white py-2.5 pl-10 pr-10 text-[15px] outline-none transition focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand-light)]"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] transition hover:text-[var(--foreground)]"
              >
                {showPassword ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
              </button>
            </div>

            {error && (
              <div className="mb-3 mt-2 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-600">
                <AlertCircleIcon className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isPending}
              className="gradient-brand mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-[15px] font-semibold text-white shadow-float transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending && (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              )}
              {isPending ? "Đang đăng nhập..." : "Đăng nhập"}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-[var(--muted)]">
            Chưa có tài khoản?{" "}
            <Link href="/signup" className="font-medium text-[var(--brand-dark)] hover:underline">
              Tạo tài khoản
            </Link>
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-[var(--muted)]">
          Bằng việc tiếp tục, bạn đồng ý với các điều khoản sử dụng của Streak & Pet.
        </p>
      </div>
    </div>
  );
}
