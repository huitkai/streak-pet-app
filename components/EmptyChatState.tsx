import { FlameIcon, HeartIcon } from "@/components/icons";

/** Hiện ở cột phải trên desktop khi người dùng chưa mở hội thoại nào —
 * tránh khoảng trắng mênh mông như bản cũ (xem prompt tái thiết kế). */
export default function EmptyChatState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
      <div className="gradient-brand-soft relative flex h-20 w-20 items-center justify-center rounded-full text-[var(--brand-dark)] shadow-glass">
        <HeartIcon className="h-9 w-9" filled />
        <div className="gradient-brand absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full text-white shadow-float">
          <FlameIcon className="h-4 w-4" />
        </div>
      </div>
      <h2 className="gradient-text text-lg font-extrabold">Tin nhắn của bạn</h2>
      <p className="max-w-xs text-sm text-[var(--muted)]">
        Chọn hội thoại với người ấy để tiếp tục trò chuyện, giữ chuỗi streak và cùng nuôi lớn thú cưng nhé.
      </p>
    </div>
  );
}
