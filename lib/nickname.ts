import type { Couple, ProfileRow } from "@/lib/types";

/**
 * Tên hiển thị của ĐỐI PHƯƠNG dưới góc nhìn của `viewerId` — ưu tiên biệt
 * danh riêng mà viewer đã đặt (couples.nickname_for_user1/2, xem
 * migration-v9-chat-customization.sql), fallback về display_name gốc, rồi
 * fallback cuối cùng về "Người ấy".
 *
 * Quy ước: nickname_for_user1 là biệt danh mà user1 NHÌN THẤY khi nói về
 * user2 (và ngược lại) — nên nếu viewer là user1, ta dùng nickname_for_user1.
 */
export function nicknameForPartner(
  couple: Pick<Couple, "user1_id" | "nickname_for_user1" | "nickname_for_user2">,
  viewerId: string,
  partnerProfile?: Pick<ProfileRow, "display_name"> | null
): string {
  const mine = viewerId === couple.user1_id ? couple.nickname_for_user1 : couple.nickname_for_user2;
  return mine?.trim() || partnerProfile?.display_name?.trim() || "Người ấy";
}

/** Biệt danh RIÊNG (không fallback) mà viewer đã đặt cho đối phương, hoặc
 * chuỗi rỗng nếu chưa đặt — dùng để điền sẵn vào input trong sheet cài đặt. */
export function myNicknameForPartner(
  couple: Pick<Couple, "user1_id" | "nickname_for_user1" | "nickname_for_user2">,
  viewerId: string
): string {
  const mine = viewerId === couple.user1_id ? couple.nickname_for_user1 : couple.nickname_for_user2;
  return mine ?? "";
}
