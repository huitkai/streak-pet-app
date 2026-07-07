/**
 * Hiện NGAY khi bấm nút quay lại (Link href="/") hoặc mở app lần đầu, trong
 * lúc server đang xác thực + đọc couple/profile/streak/tin nhắn cuối — nếu
 * không có file này, Next.js sẽ giữ nguyên màn hình cũ "đứng hình" cho tới
 * khi toàn bộ dữ liệu tải xong, tạo cảm giác nút bấm không phản hồi.
 */
export default function HomeLoading() {
  return (
    <div className="safe-top safe-bottom flex flex-1 flex-col bg-[var(--background)]">
      <header className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface)] px-4 py-3">
        <div className="h-6 w-24 animate-pulse rounded-full bg-black/10" />
        <div className="h-[34px] w-[34px] animate-pulse rounded-full bg-black/10" />
      </header>

      <div className="flex-1 overflow-y-auto">
        {[0, 1].map((i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3">
            <span className="relative shrink-0">
              <div className="h-[52px] w-[52px] animate-shimmer rounded-full" />
              {i === 0 && (
                <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[var(--surface)] bg-black/10" />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <div className="h-3.5 w-28 animate-shimmer rounded-full" />
                <div className="h-3 w-8 animate-shimmer rounded-full" />
              </div>
              <div className="mt-2 flex items-center justify-between gap-2">
                <div className="h-3 w-40 animate-shimmer rounded-full" />
                {i === 0 && <div className="h-5 w-5 shrink-0 animate-shimmer rounded-full" />}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-[var(--border)] px-4 py-2 text-center">
        <div className="mx-auto h-3.5 w-20 animate-pulse rounded-full bg-black/5" />
      </div>
    </div>
  );
}
