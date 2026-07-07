-- Mục 7 kế hoạch nâng cấp: vuốt trái/phải trên ConversationRow để ghim /
-- tắt thông báo. Theo đúng convention `nickname_for_user1/2` ở migration-v9:
-- lưu theo TỪNG NGƯỜI (không phải chung cho cả couple), vì ghim/tắt thông
-- báo là sở thích cá nhân của mỗi người, không phải cài đặt chung 2 người
-- phải thấy giống nhau (khác với theme_color).
--
-- Không thêm hành động "xoá khỏi danh sách": app hiện mỗi user chỉ thuộc
-- đúng 1 couple (bắt buộc, xem app/page.tsx redirect "/couple" nếu chưa có
-- couple) nên "xoá" cuộc trò chuyện duy nhất sẽ phá vỡ luồng chính, cần 1
-- flow "rời couple" riêng có xác nhận rõ ràng — để lại cho lượt sau nếu cần,
-- không nhét vào 1 cử chỉ vuốt nhanh dễ bấm nhầm.

alter table couples
  add column if not exists pinned_by_user1 boolean not null default false,
  add column if not exists pinned_by_user2 boolean not null default false,
  add column if not exists muted_by_user1 boolean not null default false,
  add column if not exists muted_by_user2 boolean not null default false;
