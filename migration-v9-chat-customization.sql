-- ============================================================
-- Migration v9: tuỳ chỉnh đoạn chat — đổi màu chủ đề + biệt danh riêng
-- Chạy 1 lần trong Supabase Dashboard → SQL Editor (an toàn, không mất dữ liệu cũ)
--
-- Thiết kế: mở rộng ngay trên bảng `couples` thay vì tạo bảng mới, vì đây là
-- cấu hình 1-1 với 1 cuộc trò chuyện (đúng scope hiện tại là 1 couple = 1 đoạn
-- chat). Khi app mở rộng multi-conversation (bạn bè/người thân), các bảng
-- conversation mới sau này có thể có cùng 3 cột này, hoặc tách thành bảng
-- `conversation_settings` riêng — không ảnh hưởng gì tới migration này.
-- ============================================================

-- Màu chủ đề (accent color) người dùng chọn cho khung chat — áp cho bong bóng
-- tin nhắn của mình + các điểm nhấn UI, thay thế --brand mặc định. Lưu dạng
-- hex "#rrggbb" để map thẳng vào CSS var (--brand) ở phía client; --brand-dark
-- và --brand-light được tính lại (darken/lighten) ngay trong code, không cần
-- lưu thêm cột.
alter table couples
  add column if not exists theme_color text not null default '#ec4f83';

alter table couples drop constraint if exists couples_theme_color_check;
alter table couples
  add constraint couples_theme_color_check
  check (theme_color ~ '^#[0-9a-fA-F]{6}$');

-- Biệt danh riêng mà mỗi người đặt cho ĐỐI PHƯƠNG (khác display_name gốc của
-- profiles) — nickname_for_user1 là biệt danh mà user1 nhìn thấy khi nói về
-- user2, và ngược lại. NULL nghĩa là chưa đặt -> phía code fallback về
-- display_name như hiện tại.
alter table couples
  add column if not exists nickname_for_user1 text,
  add column if not exists nickname_for_user2 text;

alter table couples drop constraint if exists couples_nickname_len_check;
alter table couples
  add constraint couples_nickname_len_check
  check (
    (nickname_for_user1 is null or char_length(nickname_for_user1) between 1 and 40)
    and (nickname_for_user2 is null or char_length(nickname_for_user2) between 1 and 40)
  );

-- Ghi chú cho RLS hiện có: các policy select/update trên `couples` đã giới hạn
-- theo user1_id/user2_id (xem fix-couples-rls.sql) nên không cần policy mới —
-- chỉ cần đảm bảo API cập nhật (lib/actions.ts) chỉ cho phép user tự đặt
-- nickname/theme cho couple mà họ là thành viên, và chỉ cho phép user đổi
-- đúng "nickname_for_<chính người kia>" tương ứng với vai trò của họ.
