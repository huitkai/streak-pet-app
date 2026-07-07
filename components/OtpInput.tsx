"use client";

import { useRef, useState, type ClipboardEvent, type KeyboardEvent } from "react";

const LENGTH = 6;

export default function OtpInput({
  onComplete,
  disabled,
}: {
  onComplete: (code: string) => void;
  disabled?: boolean;
}) {
  const [digits, setDigits] = useState<string[]>(Array(LENGTH).fill(""));
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  function setDigitAt(index: number, value: string) {
    setDigits((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }

  function handleChange(index: number, raw: string) {
    const value = raw.replace(/\D/g, "").slice(-1);
    setDigitAt(index, value);

    if (value && index < LENGTH - 1) {
      inputsRef.current[index + 1]?.focus();
    }

    const next = [...digits];
    next[index] = value;
    if (next.every((d) => d.length === 1)) {
      onComplete(next.join(""));
    }
  }

  function handleKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, LENGTH);
    if (!pasted) return;
    e.preventDefault();
    const next = Array(LENGTH).fill("");
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
    setDigits(next);
    const lastIndex = Math.min(pasted.length, LENGTH) - 1;
    inputsRef.current[lastIndex]?.focus();
    if (pasted.length === LENGTH) onComplete(pasted);
  }

  return (
    <div className="flex justify-center gap-2">
      {digits.map((digit, i) => (
        <input
          key={i}
          ref={(el) => {
            inputsRef.current[i] = el;
          }}
          value={digit}
          disabled={disabled}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={1}
          aria-label={`Số thứ ${i + 1} của mã xác nhận`}
          className="h-12 w-10 rounded-xl border border-[var(--border)] bg-white text-center text-lg font-semibold outline-none transition focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand-light)] disabled:opacity-60 sm:w-11"
        />
      ))}
    </div>
  );
}
