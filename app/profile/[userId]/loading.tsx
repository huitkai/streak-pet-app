/**
 * Hiện ngay khi bấm vào avatar/hồ sơ, trong lúc server đang xác thực + đọc
 * profile/couple/streak/pet — tránh cảm giác "bấm không phản hồi" trong lúc
 * chờ mấy round-trip dữ liệu đó.
 */
export default function ProfileLoading() {
  return (
    <div className="safe-top safe-bottom flex flex-1 flex-col bg-[var(--background)]">
      <header className="flex items-center gap-2 border-b border-[var(--border)] bg-[var(--surface)] px-2 py-2.5">
        <div className="h-8 w-8 animate-pulse rounded-full bg-black/5" />
        <div className="h-3.5 w-24 animate-pulse rounded-full bg-black/10" />
      </header>

      <div className="h-24 w-full animate-pulse bg-black/5" />
      <div className="-mt-12 flex flex-col items-center px-4 pb-6">
        <div className="h-24 w-24 animate-pulse rounded-full bg-black/10 ring-4 ring-[var(--background)]" />
        <div className="mt-3 h-4 w-32 animate-pulse rounded-full bg-black/10" />
      </div>

      <div className="mx-4 mb-6 flex flex-col items-center gap-3 rounded-2xl bg-[var(--surface)] p-5 shadow-sm">
        <div className="h-2.5 w-24 animate-pulse rounded-full bg-black/5" />
        <div className="h-20 w-20 animate-pulse rounded-full bg-black/10" />
        <div className="h-3 w-28 animate-pulse rounded-full bg-black/5" />
        <div className="h-7 w-20 animate-pulse rounded-full bg-black/10" />
      </div>
    </div>
  );
}
