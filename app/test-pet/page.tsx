"use client";

import PetAvatar from "@/components/PetAvatar";

/**
 * Trang test riêng — xem trực tiếp bất kỳ species/stage/mood nào mà KHÔNG phụ
 * thuộc vào tiến trình pet thật của tài khoản (đỡ phải để pet thật lùi về baby
 * hay tạo acc mới chỉ để test animation). Xoá file này khi đã dựng xong hết,
 * không cần thiết cho người dùng cuối.
 */
export default function TestPetPage() {
  return (
    <div style={{ display: "flex", gap: 24, flexWrap: "wrap", padding: 40 }}>
      <PetAvatar species="cat" stage="baby" mood="happy" size={200} interactive />
      <PetAvatar species="cat" stage="baby" mood="neutral" size={200} interactive />
      <PetAvatar species="cat" stage="baby" mood="sad" size={200} interactive />
      <PetAvatar species="cat" stage="baby" mood="sick" size={200} interactive />
    </div>
  );
}