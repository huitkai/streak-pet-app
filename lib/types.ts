export type PetStage = "egg" | "baby" | "teen" | "adult" | "legendary";
export type PetMood = "happy" | "neutral" | "sad" | "sick";
export type PetSpeciesValue =
  | "cat"
  | "fox"
  | "dragon"
  | "bunny"
  | "panda"
  | "owl"
  | "otter"
  | "penguin"
  | "hamster"
  | "wolf"
  | "unicorn"
  | "koala";

/** Rẽ nhánh tiến hóa — mỗi loài chia làm 2 "khí chất" khác nhau từ giai đoạn adult trở lên.
 * Được SUY RA (không lưu DB) từ id cặp đôi + loài, nên luôn nhất quán mà không cần migration riêng. */
export type PetVariant = "radiant" | "mystic";

/** Phụ kiện / skin cho pet — vài cái mở khóa theo mốc streak, vài cái theo mùa. */
export type PetAccessoryValue =
  | "none"
  | "bowtie"
  | "sunglasses"
  | "flower_crown"
  | "love_headband"
  | "wizard_hat"
  | "santa_hat"
  | "pumpkin_hat";

export interface Couple {
  id: string;
  user1_id: string;
  user2_id: string | null;
  invite_code: string;
  pet_name: string;
  pet_species: PetSpeciesValue;
  /** Phụ kiện đang đeo — cột mới (xem migration-v8-pet-evolution.sql). Mặc định 'none'. */
  pet_accessory?: PetAccessoryValue | null;
  /** Màu chủ đề khung chat, dạng "#rrggbb" — xem migration-v9-chat-customization.sql
   * và lib/theme.ts (suy ra --brand-dark/--brand-light từ mã này). */
  theme_color?: string | null;
  /** Biệt danh mà user1 đặt cho user2 (null = chưa đặt, fallback display_name). */
  nickname_for_user1?: string | null;
  /** Biệt danh mà user2 đặt cho user1 (null = chưa đặt, fallback display_name). */
  nickname_for_user2?: string | null;
  /** Ghim/tắt thông báo hội thoại — sở thích CÁ NHÂN từng người, xem
   * migration-v11-conversation-actions.sql. */
  pinned_by_user1?: boolean;
  pinned_by_user2?: boolean;
  muted_by_user1?: boolean;
  muted_by_user2?: boolean;
  created_at: string;
}

export interface StreakRow {
  couple_id: string;
  current_streak: number;
  longest_streak: number;
  last_active_date: string | null;
  user1_sent_today: boolean;
  user2_sent_today: boolean;
  updated_at: string;
}

export interface PetRow {
  couple_id: string;
  stage: PetStage;
  mood: PetMood;
  updated_at: string;
}

export interface MessageRow {
  id: string;
  couple_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  reply_to_id?: string | null;
  forwarded_from_id?: string | null;
  edited_at?: string | null;
  deleted_at?: string | null;
  /** chỉ tồn tại phía client trong lúc chờ server xác nhận (optimistic UI) */
  pending?: boolean;
  failed?: boolean;
}

export interface PinnedMessageRow {
  couple_id: string;
  message_id: string;
  pinned_by: string;
  pinned_at: string;
}

/** 1 dòng "user X đã đọc tới lúc nào" trong 1 couple — dùng để suy ra tin
 * nào đã được đối phương XEM (created_at <= last_read_at của họ). */
export interface MessageReadRow {
  couple_id: string;
  user_id: string;
  last_read_at: string;
}

/** 1 dòng "user X đã NHẬN tin tới lúc nào" trong 1 couple — cùng hình dạng
 * với MessageReadRow nhưng mốc này được cập nhật ngay khi client nhận được
 * tin qua Realtime (hoặc khi mở lại app), KHÔNG cần tab đang hiển thị —
 * khác với last_read_at chỉ cập nhật khi user thực sự nhìn thấy màn hình.
 * Xem migration-v10-delivered-status.sql. */
export interface MessageDeliveryRow {
  couple_id: string;
  user_id: string;
  last_delivered_at: string;
}

/** 1 cảm xúc mà 1 user thả cho 1 tin nhắn — mỗi user chỉ có 1 dòng / tin
 * nhắn (unique message_id+user_id), thả lại cảm xúc khác sẽ ghi đè dòng cũ. */
export interface ReactionRow {
  id: string;
  message_id: string;
  couple_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

export interface ProfileRow {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  updated_at: string;
  /** Lần cuối user này hoạt động trong app — cập nhật định kỳ bởi usePresenceHeartbeat. */
  last_seen: string | null;
}

// Minimal Database type so @supabase/ssr generics are happy.
// Bạn có thể generate type đầy đủ bằng: npx supabase gen types typescript
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Database = any;

/**
 * 1 dòng trong danh sách hội thoại (app/page.tsx) — hiện tại mọi hội thoại
 * đều type: 'couple' (đúng scope hiện tại của app), nhưng cấu trúc đã tổng
 * quát hoá sẵn: khi mở rộng bạn bè/người thân chỉ cần thêm nguồn dữ liệu
 * khác đổ vào cùng mảng ConversationSummary[], không cần viết lại UI danh
 * sách (ConversationRow.tsx) hay logic sắp xếp/tìm kiếm.
 */
export interface ConversationSummary {
  /** id của bảng gốc (hiện là couples.id) — dùng làm key + link tới /chat. */
  id: string;
  type: "couple" | "friend" | "family";
  partnerId: string | null;
  partnerProfile: ProfileRow | null;
  /** Tên hiệu lực để hiển thị (biệt danh nếu có, fallback display_name). */
  nickname: string;
  petName: string;
  currentStreak: number;
  /** Preview tin nhắn cuối, đã format sẵn (vd "Bạn: đã gửi 1 sticker"). */
  previewText: string;
  lastMessageAt: string | null;
  /** Số tin nhắn CHƯA đọc gửi TỪ đối phương, tính theo message_reads.last_read_at. */
  unreadCount: number;
  themeColor: string;
  isPinned: boolean;
  isMuted: boolean;
  /** true nếu đối phương TỪNG gửi ảnh "Chụp nhanh" gần đây (bất kể đã xem
   * hay chưa) — quyết định có hiện viền quanh avatar hay không (giống việc
   * có "story" hay không trên Instagram). */
  hasInstant: boolean;
  /** true nếu đối phương có gửi ảnh "Chụp nhanh" (stamp_photo) sau lần cuối
   * mình đọc đoạn chat này — dùng để hiện viền tím kiểu "story chưa xem"
   * quanh avatar; đọc rồi (mở /chat) thì viền tự chuyển sang xám/trắng. */
  hasUnseenInstant: boolean;
}
