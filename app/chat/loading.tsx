/**
 * Hiện ngay khi vừa bấm vào đoạn chat, TRƯỚC KHI dữ liệu (couple, streak,
 * pet, tin nhắn...) tải xong ở server — nhờ vậy cảm giác bấm phát ăn ngay,
 * thay vì màn hình trắng/đứng im vài trăm ms tới cả giây trong lúc chờ
 * Supabase trả dữ liệu. Next.js tự động hiện file này (Suspense boundary)
 * rồi thay bằng nội dung thật khi page.tsx render xong.
 */
export default function ChatLoading() {
  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-[var(--background)]">
      <header className="safe-top flex items-center gap-2 border-b border-[var(--border)] bg-[var(--surface)] px-2.5 py-2.5">
        <div className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-black/5" />
        <div className="flex-1">
          <div className="h-3.5 w-28 animate-pulse rounded-full bg-black/10" />
          <div className="mt-1.5 h-2.5 w-16 animate-pulse rounded-full bg-black/5" />
        </div>
        <div className="h-8 w-14 shrink-0 animate-pulse rounded-full bg-black/10" />
      </header>

      <div className="flex-1 space-y-3 px-3 py-4">
        <div className="flex justify-start">
          <div className="h-9 w-40 animate-pulse rounded-2xl rounded-bl-md bg-black/5" />
        </div>
        <div className="flex justify-end">
          <div className="h-9 w-28 animate-pulse rounded-2xl rounded-br-md bg-[var(--brand-light)]" />
        </div>
        <div className="flex justify-start">
          <div className="h-9 w-52 animate-pulse rounded-2xl rounded-bl-md bg-black/5" />
        </div>
      </div>

      <div className="safe-bottom border-t border-[var(--border)] bg-[var(--surface)] px-2.5 py-2">
        <div className="h-9 w-full animate-pulse rounded-full bg-black/5" />
      </div>
    </div>
  );
}
