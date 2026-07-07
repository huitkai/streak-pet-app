-- ============================================================
-- Fix: cho phép tìm couple theo invite_code khi CHƯA phải thành viên
-- (sửa lỗi "Không tìm thấy mã mời này" dù mã đúng)
-- Chạy trong Supabase SQL Editor. An toàn chạy lại nhiều lần.
-- ============================================================

drop policy if exists "select own couple" on couples;

create policy "select own couple" on couples
  for select using (
    user1_id = auth.uid()
    or user2_id = auth.uid()
    or user2_id is null  -- cho phép tìm các couple đang "mở" (chờ ghép đôi) bằng invite_code
  );

-- Kiểm tra lại: phải thấy policy "select own couple" với điều kiện mới
select policyname, cmd, qual
from pg_policies
where tablename = 'couples' and policyname = 'select own couple';
