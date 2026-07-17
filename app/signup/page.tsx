"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { signUp, resendConfirmation, verifySignupOtp } from "@/lib/actions";
import {
  MailIcon,
  LockIcon,
  EyeIcon,
  EyeOffIcon,
  AlertCircleIcon,
  ShieldCheckIcon,
  ArrowLeftIcon,
} from "@/components/icons";
import OtpInput from "@/components/OtpInput";

type SignUpResult = { error?: string; success?: boolean; email?: string } | undefined;

export default function SignupPage() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [showPassword, setShowPassword] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [resendState, setResendState] = useState<"idle" | "sending" | "sent">("idle");
  const [resendError, setResendError] = useState<string | null>(null);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [otpKey, setOtpKey] = useState(0);

  // Dùng useTransition (thay vì useState "loading" thủ công): isPending
  // được React bật lên ngay khi bấm nút, không cần chờ signUp() phản hồi
  // mới vẽ lại UI — spinner hiện ngay lập tức khi tap.
  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res: SignUpResult = await signUp(formData);
      if (res?.error) setError(res.error);
      if (res?.success && res.email) setSentTo(res.email);
    });
  }

  async function handleResend() {
    if (!sentTo) return;
    setResendState("sending");
    setResendError(null);
    const res = await resendConfirmation(sentTo);
    if (res?.error) {
      setResendError(res.error);
      setResendState("idle");
    } else {
      setResendState("sent");
      setOtpError(null);
      setOtpKey((k) => k + 1); // reset 6 ô nhập về trống
    }
  }

  async function handleVerify(code: string) {
    if (!sentTo) return;
    setVerifying(true);
    setOtpError(null);
    const res = await verifySignupOtp(sentTo, code);
    if (res?.error) {
      setOtpError(res.error);
      setOtpKey((k) => k + 1);
    }
    setVerifying(false);
  }

  if (sentTo) {
    return (
      <div className="safe-top safe-bottom flex flex-1 items-center justify-center overflow-y-auto px-4 py-8">
        <div className="glass-surface-strong w-full max-w-sm rounded-3xl border p-8 text-center shadow-glass">
          <button
            onClick={() => setSentTo(null)}
            aria-label="Quay lại"
            className="mb-2 -ml-1 flex h-8 w-8 items-center justify-center rounded-full text-[var(--muted)] transition hover:bg-black/5"
          >
            <ArrowLeftIcon className="h-4 w-4" />
          </button>

          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--brand-light)] text-[var(--brand)]">
            <MailIcon className="h-6 w-6" />
          </div>
          <h1 className="mb-2 text-lg font-semibold text-[var(--foreground)]">Nhập mã xác nhận</h1>
          <p className="mb-1 text-sm text-[var(--muted)]">Chúng tôi đã gửi mã gồm 6 số đến</p>
          <p className="mb-6 break-all text-sm font-medium text-[var(--foreground)]">{sentTo}</p>

          <OtpInput key={otpKey} onComplete={handleVerify} disabled={verifying} />

          {verifying && <p className="mt-3 text-sm text-[var(--muted)]">Đang xác nhận...</p>}

          {otpError && (
            <p className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-left text-sm text-red-600">
              <AlertCircleIcon className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{otpError}</span>
            </p>
          )}

          <p className="mb-3 mt-6 text-xs text-[var(--muted)]">
            Không thấy mã mới? Mail cũ trong hộp thư không dùng được — hãy bấm nút dưới để nhận mã MỚI, rồi nhập đúng mã đó.
          </p>

          <button
            onClick={handleResend}
            disabled={resendState !== "idle"}
            className="mb-3 w-full rounded-xl border border-[var(--border)] bg-white py-2.5 text-sm font-medium text-[var(--foreground)] transition hover:bg-[var(--background)] disabled:opacity-60"
          >
            {resendState === "sending"
              ? "Đang gửi mã mới..."
              : resendState === "sent"
              ? "Đã gửi mã mới — kiểm tra email"
              : "Gửi lại mã xác nhận"}
          </button>

          {resendError && (
            <p className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-left text-sm text-red-600">
              <AlertCircleIcon className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{resendError}</span>
            </p>
          )}

          <Link href="/login" className="text-sm font-medium text-[var(--brand-dark)] hover:underline">
            Quay lại đăng nhập
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="safe-top safe-bottom flex flex-1 items-center justify-center overflow-y-auto px-4 py-8">
      <div className="w-full max-w-sm">
        {/* Thương hiệu */}
        <div className="mb-7 flex flex-col items-center text-center">
          <div className="mb-3 flex h-16 w-16 items-center justify-center overflow-hidden rounded-[22px] shadow-sm ring-1 ring-black/5">
            <Image src="/icons/icon-192.png" alt="Streak & Pet" width={64} height={64} className="h-full w-full object-cover" priority />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-[var(--foreground)]">Streak & Pet</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">Chat mỗi ngày, giữ chuỗi, nuôi lớn thú cưng của hai bạn</p>
        </div>

        <div className="glass-surface-strong rounded-3xl border p-7 shadow-glass">
          <h2 className="mb-1 text-lg font-semibold text-[var(--foreground)]">Tạo tài khoản</h2>
          <p className="mb-5 text-sm text-[var(--muted)]">Chỉ mất chưa đến một phút</p>

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
            <div className="relative mb-1.5">
              <LockIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                minLength={6}
                placeholder="Tối thiểu 6 ký tự"
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
            <p className="mb-4 flex items-center gap-1.5 text-xs text-[var(--muted)]">
              <ShieldCheckIcon className="h-3.5 w-3.5 shrink-0" />
              Mật khẩu của bạn được mã hoá và không ai xem được.
            </p>

            {error && (
              <div className="mb-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-600">
                <AlertCircleIcon className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isPending}
              className="gradient-brand mt-2 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-[15px] font-semibold text-white shadow-float transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending && (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              )}
              {isPending ? "Đang tạo tài khoản..." : "Tạo tài khoản"}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-[var(--muted)]">
            Đã có tài khoản?{" "}
            <Link href="/login" className="font-medium text-[var(--brand-dark)] hover:underline">
              Đăng nhập
            </Link>
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-[var(--muted)]">
          Bằng việc tạo tài khoản, bạn đồng ý với các điều khoản sử dụng của Streak & Pet.
        </p>
      </div>
    </div>
  );
}
