"use client";

import { useMemo, useState } from "react";
import { SearchIcon, XIcon } from "@/components/icons";

/**
 * Bộ emoji đầy đủ nhưng KHÔNG dùng thư viện nặng như `emoji-mart` (theo đúng
 * ghi chú ở mục 6 kế hoạch) — tự build từ 1 danh mục tinh gọn (~260 emoji phổ
 * biến nhất trong chat, đủ dùng thay vì toàn bộ ~3700 emoji Unicode mà 99%
 * không ai dùng khi nhắn tin) kèm alias tiếng Việt để tìm kiếm theo nghĩa
 * thay vì phải nhớ tên tiếng Anh.
 */
type EmojiCategory = {
  key: string;
  label: string;
  emojis: { char: string; aliases: string[] }[];
};

const CATEGORIES: EmojiCategory[] = [
  {
    key: "smileys",
    label: "Cảm xúc",
    emojis: [
      { char: "😀", aliases: ["cười", "vui"] },
      { char: "😁", aliases: ["cười", "tươi"] },
      { char: "😂", aliases: ["cười", "buồn cười", "haha"] },
      { char: "🤣", aliases: ["cười lăn", "haha"] },
      { char: "😊", aliases: ["cười", "ngại"] },
      { char: "😍", aliases: ["yêu", "mê"] },
      { char: "🥰", aliases: ["yêu", "thương"] },
      { char: "😘", aliases: ["hôn", "yêu"] },
      { char: "😗", aliases: ["hôn"] },
      { char: "😙", aliases: ["hôn"] },
      { char: "😚", aliases: ["hôn", "ngại"] },
      { char: "🙂", aliases: ["cười nhẹ"] },
      { char: "🙃", aliases: ["lộn ngược", "trêu"] },
      { char: "😉", aliases: ["nháy mắt"] },
      { char: "😌", aliases: ["nhẹ nhõm"] },
      { char: "😋", aliases: ["ngon", "thèm"] },
      { char: "😛", aliases: ["lè lưỡi", "trêu"] },
      { char: "😜", aliases: ["lè lưỡi", "nháy mắt"] },
      { char: "🤪", aliases: ["điên", "lầy"] },
      { char: "😝", aliases: ["lè lưỡi"] },
      { char: "🤑", aliases: ["tiền"] },
      { char: "🤗", aliases: ["ôm"] },
      { char: "🤭", aliases: ["che miệng", "ngại"] },
      { char: "🤫", aliases: ["suỵt", "im lặng"] },
      { char: "🤔", aliases: ["suy nghĩ"] },
      { char: "🫡", aliases: ["chào", "nghiêm túc"] },
      { char: "🤐", aliases: ["im lặng", "khoá miệng"] },
      { char: "🤨", aliases: ["nghi ngờ"] },
      { char: "😐", aliases: ["vô cảm"] },
      { char: "😑", aliases: ["chán"] },
      { char: "😶", aliases: ["không nói"] },
      { char: "😏", aliases: ["cười đểu", "cà khịa"] },
      { char: "😒", aliases: ["chán", "khinh"] },
      { char: "🙄", aliases: ["đảo mắt", "chán"] },
      { char: "😬", aliases: ["gượng gạo"] },
      { char: "🤥", aliases: ["nói dối"] },
      { char: "😴", aliases: ["ngủ", "buồn ngủ"] },
      { char: "😪", aliases: ["buồn ngủ"] },
      { char: "😮‍💨", aliases: ["thở dài"] },
      { char: "😷", aliases: ["ốm", "khẩu trang"] },
      { char: "🤒", aliases: ["sốt", "ốm"] },
      { char: "🤕", aliases: ["đau", "băng bó"] },
      { char: "🤢", aliases: ["buồn nôn"] },
      { char: "🤮", aliases: ["nôn"] },
      { char: "🥵", aliases: ["nóng"] },
      { char: "🥶", aliases: ["lạnh"] },
      { char: "😵", aliases: ["choáng"] },
      { char: "😵‍💫", aliases: ["chóng mặt"] },
      { char: "🥴", aliases: ["say", "lâng lâng"] },
      { char: "😎", aliases: ["ngầu"] },
      { char: "🤓", aliases: ["mọt sách"] },
      { char: "🧐", aliases: ["soi mói", "kính"] },
      { char: "😕", aliases: ["bối rối"] },
      { char: "😟", aliases: ["lo lắng"] },
      { char: "🙁", aliases: ["buồn"] },
      { char: "😮", aliases: ["ngạc nhiên", "wow"] },
      { char: "😯", aliases: ["ngạc nhiên"] },
      { char: "😲", aliases: ["sốc"] },
      { char: "😳", aliases: ["ngại", "đỏ mặt"] },
      { char: "🥺", aliases: ["năn nỉ", "tội"] },
      { char: "😦", aliases: ["sợ"] },
      { char: "😧", aliases: ["sợ hãi"] },
      { char: "😨", aliases: ["sợ"] },
      { char: "😰", aliases: ["lo lắng", "toát mồ hôi"] },
      { char: "😥", aliases: ["buồn", "thở phào"] },
      { char: "😢", aliases: ["khóc", "buồn"] },
      { char: "😭", aliases: ["khóc to"] },
      { char: "😱", aliases: ["hét", "sợ"] },
      { char: "😖", aliases: ["khó chịu"] },
      { char: "😣", aliases: ["cố gắng"] },
      { char: "😞", aliases: ["thất vọng"] },
      { char: "😓", aliases: ["mệt", "toát mồ hôi"] },
      { char: "😩", aliases: ["mệt mỏi"] },
      { char: "😫", aliases: ["kiệt sức"] },
      { char: "🥱", aliases: ["ngáp"] },
      { char: "😤", aliases: ["hùng hổ", "tức"] },
      { char: "😡", aliases: ["giận", "tức"] },
      { char: "😠", aliases: ["giận"] },
      { char: "🤬", aliases: ["chửi", "tức điên"] },
      { char: "😈", aliases: ["quỷ", "tinh nghịch"] },
      { char: "👿", aliases: ["quỷ giận"] },
      { char: "💀", aliases: ["chết", "xương"] },
      { char: "☠️", aliases: ["chết"] },
      { char: "🤡", aliases: ["hề"] },
      { char: "👻", aliases: ["ma"] },
      { char: "🥳", aliases: ["ăn mừng", "tiệc"] },
      { char: "🥸", aliases: ["cải trang"] },
    ],
  },
  {
    key: "gestures",
    label: "Cử chỉ",
    emojis: [
      { char: "👍", aliases: ["like", "đồng ý", "ok"] },
      { char: "👎", aliases: ["dislike", "không đồng ý"] },
      { char: "👌", aliases: ["ok"] },
      { char: "✌️", aliases: ["chiến thắng", "peace"] },
      { char: "🤞", aliases: ["may mắn", "chéo tay"] },
      { char: "🤟", aliases: ["yêu", "rock"] },
      { char: "🤘", aliases: ["rock"] },
      { char: "👋", aliases: ["chào", "vẫy tay"] },
      { char: "🤙", aliases: ["gọi điện"] },
      { char: "💪", aliases: ["cơ bắp", "cố lên"] },
      { char: "🙏", aliases: ["cầu nguyện", "cảm ơn", "xin lỗi"] },
      { char: "👏", aliases: ["vỗ tay"] },
      { char: "🙌", aliases: ["giơ tay", "ăn mừng"] },
      { char: "🤝", aliases: ["bắt tay"] },
      { char: "👐", aliases: ["mở tay"] },
      { char: "🤲", aliases: ["xin"] },
      { char: "✋", aliases: ["dừng lại", "cao tay"] },
      { char: "🖐️", aliases: ["bàn tay"] },
      { char: "👆", aliases: ["trỏ lên"] },
      { char: "👇", aliases: ["trỏ xuống"] },
      { char: "👈", aliases: ["trỏ trái"] },
      { char: "👉", aliases: ["trỏ phải"] },
      { char: "☝️", aliases: ["trỏ lên"] },
      { char: "🫶", aliases: ["trái tim tay"] },
      { char: "🤳", aliases: ["tự sướng", "selfie"] },
      { char: "💅", aliases: ["làm móng", "chảnh"] },
    ],
  },
  {
    key: "hearts",
    label: "Trái tim",
    emojis: [
      { char: "❤️", aliases: ["yêu", "tim đỏ"] },
      { char: "🧡", aliases: ["tim cam"] },
      { char: "💛", aliases: ["tim vàng"] },
      { char: "💚", aliases: ["tim xanh lá"] },
      { char: "💙", aliases: ["tim xanh dương"] },
      { char: "💜", aliases: ["tim tím"] },
      { char: "🖤", aliases: ["tim đen"] },
      { char: "🤍", aliases: ["tim trắng"] },
      { char: "🤎", aliases: ["tim nâu"] },
      { char: "💔", aliases: ["tim vỡ", "chia tay"] },
      { char: "❤️‍🔥", aliases: ["tim lửa"] },
      { char: "❤️‍🩹", aliases: ["tim băng bó"] },
      { char: "💕", aliases: ["hai tim", "yêu"] },
      { char: "💞", aliases: ["tim xoay"] },
      { char: "💓", aliases: ["tim đập"] },
      { char: "💗", aliases: ["tim lớn dần"] },
      { char: "💖", aliases: ["tim lấp lánh"] },
      { char: "💘", aliases: ["tim mũi tên", "cupid"] },
      { char: "💝", aliases: ["tim nơ", "quà"] },
      { char: "💟", aliases: ["ký hiệu tim"] },
      { char: "💌", aliases: ["thư tình"] },
      { char: "😻", aliases: ["mèo yêu"] },
      { char: "💑", aliases: ["cặp đôi"] },
      { char: "💏", aliases: ["hôn nhau"] },
    ],
  },
  {
    key: "animals",
    label: "Động vật",
    emojis: [
      { char: "🐶", aliases: ["chó"] },
      { char: "🐱", aliases: ["mèo"] },
      { char: "🐭", aliases: ["chuột"] },
      { char: "🐹", aliases: ["hamster"] },
      { char: "🐰", aliases: ["thỏ"] },
      { char: "🦊", aliases: ["cáo"] },
      { char: "🐻", aliases: ["gấu"] },
      { char: "🐼", aliases: ["gấu trúc"] },
      { char: "🐨", aliases: ["gấu koala"] },
      { char: "🐯", aliases: ["hổ"] },
      { char: "🦁", aliases: ["sư tử"] },
      { char: "🐮", aliases: ["bò"] },
      { char: "🐷", aliases: ["heo"] },
      { char: "🐸", aliases: ["ếch"] },
      { char: "🐵", aliases: ["khỉ"] },
      { char: "🐔", aliases: ["gà"] },
      { char: "🐧", aliases: ["chim cánh cụt"] },
      { char: "🐦", aliases: ["chim"] },
      { char: "🦄", aliases: ["kỳ lân"] },
      { char: "🐝", aliases: ["ong"] },
      { char: "🦋", aliases: ["bướm"] },
      { char: "🐢", aliases: ["rùa"] },
      { char: "🐳", aliases: ["cá voi"] },
      { char: "🐬", aliases: ["cá heo"] },
      { char: "🐠", aliases: ["cá"] },
    ],
  },
  {
    key: "food",
    label: "Đồ ăn",
    emojis: [
      { char: "🍎", aliases: ["táo"] },
      { char: "🍊", aliases: ["cam"] },
      { char: "🍋", aliases: ["chanh"] },
      { char: "🍉", aliases: ["dưa hấu"] },
      { char: "🍇", aliases: ["nho"] },
      { char: "🍓", aliases: ["dâu"] },
      { char: "🍑", aliases: ["đào", "mông"] },
      { char: "🍍", aliases: ["dứa"] },
      { char: "🥭", aliases: ["xoài"] },
      { char: "🍕", aliases: ["pizza"] },
      { char: "🍔", aliases: ["hamburger"] },
      { char: "🍟", aliases: ["khoai tây chiên"] },
      { char: "🌭", aliases: ["xúc xích"] },
      { char: "🍿", aliases: ["bắp rang"] },
      { char: "🍜", aliases: ["mì", "phở"] },
      { char: "🍣", aliases: ["sushi"] },
      { char: "🍰", aliases: ["bánh kem"] },
      { char: "🎂", aliases: ["sinh nhật", "bánh"] },
      { char: "🍩", aliases: ["donut"] },
      { char: "🍪", aliases: ["bánh quy"] },
      { char: "🍫", aliases: ["socola"] },
      { char: "🍬", aliases: ["kẹo"] },
      { char: "🍭", aliases: ["kẹo mút"] },
      { char: "☕", aliases: ["cà phê"] },
      { char: "🍵", aliases: ["trà"] },
      { char: "🧋", aliases: ["trà sữa"] },
      { char: "🍺", aliases: ["bia"] },
      { char: "🍷", aliases: ["rượu vang"] },
    ],
  },
  {
    key: "activities",
    label: "Hoạt động",
    emojis: [
      { char: "🎉", aliases: ["ăn mừng", "tiệc"] },
      { char: "🎊", aliases: ["confetti"] },
      { char: "🎁", aliases: ["quà"] },
      { char: "🎈", aliases: ["bóng bay"] },
      { char: "🎵", aliases: ["nhạc"] },
      { char: "🎶", aliases: ["nốt nhạc"] },
      { char: "🔥", aliases: ["lửa", "streak", "hot"] },
      { char: "✨", aliases: ["lấp lánh"] },
      { char: "⭐", aliases: ["sao"] },
      { char: "🌟", aliases: ["sao lấp lánh"] },
      { char: "💯", aliases: ["100 điểm", "chuẩn"] },
      { char: "💤", aliases: ["ngủ"] },
      { char: "💢", aliases: ["tức giận"] },
      { char: "💥", aliases: ["nổ", "bùm"] },
      { char: "💦", aliases: ["mồ hôi", "nước"] },
      { char: "💨", aliases: ["chạy nhanh"] },
      { char: "🕳️", aliases: ["lỗ đen"] },
      { char: "💬", aliases: ["tin nhắn"] },
      { char: "👀", aliases: ["nhìn", "mắt"] },
      { char: "🌈", aliases: ["cầu vồng"] },
      { char: "☀️", aliases: ["nắng", "mặt trời"] },
      { char: "🌙", aliases: ["mặt trăng"] },
      { char: "☁️", aliases: ["mây"] },
      { char: "🌧️", aliases: ["mưa"] },
      { char: "❄️", aliases: ["tuyết"] },
    ],
  },
];

const ALL_EMOJIS = CATEGORIES.flatMap((c) => c.emojis.map((e) => ({ ...e, category: c.key })));

export default function EmojiFullPicker({
  onSelect,
  onClose,
  title = "Chọn emoji",
}: {
  onSelect: (emoji: string) => void;
  onClose: () => void;
  title?: string;
}) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0].key);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null; // null = không tìm kiếm, hiển thị theo tab category
    return ALL_EMOJIS.filter(
      (e) => e.char.includes(q) || e.aliases.some((a) => a.toLowerCase().includes(q))
    );
  }, [query]);

  const shown = filtered ?? CATEGORIES.find((c) => c.key === activeCategory)?.emojis ?? [];

  return (
    <div className="flex h-80 w-full flex-col">
      <div className="mb-2 flex items-center gap-2 px-1">
        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--muted)]" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`${title}...`}
            aria-label={title}
            className="w-full rounded-full bg-black/5 py-1.5 pl-8 pr-3 text-[13px] outline-none placeholder:text-[var(--muted)]"
          />
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[var(--muted)] hover:bg-black/5"
        >
          <XIcon className="h-4 w-4" />
        </button>
      </div>

      {!filtered && (
        <div className="thin-scroll mb-1.5 flex shrink-0 gap-1 overflow-x-auto px-1 pb-1">
          {CATEGORIES.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => setActiveCategory(c.key)}
              className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
                activeCategory === c.key
                  ? "bg-[var(--brand)] text-white"
                  : "bg-black/5 text-[var(--muted)] hover:bg-black/10"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      )}

      <div className="thin-scroll grid flex-1 grid-cols-7 content-start gap-0.5 overflow-y-auto px-1">
        {shown.length === 0 ? (
          <p className="col-span-7 py-8 text-center text-xs text-[var(--muted)]">
            Không tìm thấy emoji nào khớp &ldquo;{query}&rdquo;.
          </p>
        ) : (
          shown.map((e, i) => (
            <button
              key={`${e.char}-${i}`}
              type="button"
              onClick={() => onSelect(e.char)}
              aria-label={e.aliases[0] ?? e.char}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-xl transition active:scale-90 hover:bg-black/5"
            >
              {e.char}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
