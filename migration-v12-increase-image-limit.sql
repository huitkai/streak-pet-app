-- ============================================================
-- Migration v12: NÂNG giới hạn dung lượng bucket "chat-images"
-- Chạy 1 lần trong Supabase Dashboard → SQL Editor.
-- An toàn để chạy lại nhiều lần, không mất dữ liệu cũ.
--
-- LÝ DO CẦN MIGRATION NÀY:
-- Từ khi tính năng "Chụp nhanh" (Instant Capture) giữ nguyên ĐÚNG độ phân
-- giải camera thật (không hạ/nén) và xuất PNG lossless (không mất dữ liệu,
-- có alpha cho khung răng cưa) để đảm bảo chất lượng ảnh 100%, dung lượng
-- 1 file ảnh có thể dễ dàng vượt 15MB (giới hạn cũ đặt ở migration v4) —
-- nhất là ảnh nhiều chi tiết/nhiễu (chụp màn hình, ảnh thiếu sáng...).
-- Khi vượt giới hạn, Supabase Storage trả lỗi:
--   "The object exceeded the maximum allowed size"
-- và bong bóng ảnh trong chat bị đánh dấu "Gửi thất bại".
--
-- Migration này KHÔNG đổi bất kỳ logic nén/resize ảnh nào ở phía client —
-- chỉ nới trần dung lượng cho phép ở phía Storage để chấp nhận file ảnh gốc
-- lớn hơn, đúng theo yêu cầu giữ nguyên chất lượng/độ phân giải ảnh.
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit)
values ('chat-images', 'chat-images', true, 52428800) -- 50MB/ảnh (tăng từ 15MB)
on conflict (id) do update set file_size_limit = excluded.file_size_limit;

-- LƯU Ý QUAN TRỌNG: nếu project Supabase của bạn (ở Project Settings →
-- Storage → "Global file size limit" / "Upload file size limit") đang đặt
-- 1 mức TRẦN THẤP HƠN 50MB, thì trần đó của project sẽ áp dụng trước và
-- vẫn chặn upload dù bucket đã cho phép 50MB — nếu vẫn còn gặp lỗi tương tự
-- sau khi chạy migration này, hãy kiểm tra và nâng luôn giới hạn ở mục
-- Project Settings → Storage trên Dashboard.
