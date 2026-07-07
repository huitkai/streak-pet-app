-- ============================================================
-- Fix / re-apply RLS policies cho bảng "couples"
-- An toàn để chạy lại nhiều lần, không làm mất dữ liệu.
-- Chạy trong Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Xác nhận RLS đang bật
alter table couples enable row level security;

-- 2. Xoá các policy cũ (nếu có) để tránh trùng/lỗi, rồi tạo lại từ đầu
drop policy if exists "select own couple" on couples;
drop policy if exists "insert couple as creator" on couples;
drop policy if exists "join couple as user2" on couples;

create policy "select own couple" on couples
  for select using (user1_id = auth.uid() or user2_id = auth.uid());

create policy "insert couple as creator" on couples
  for insert with check (user1_id = auth.uid());

create policy "join couple as user2" on couples
  for update using (user2_id is null)
  with check (user2_id = auth.uid());

-- 3. Kiểm tra lại: liệt kê toàn bộ policy hiện có trên bảng couples
-- (chạy riêng câu này để xem kết quả, phải thấy đủ 3 policy ở trên)
select policyname, cmd, qual, with_check
from pg_policies
where tablename = 'couples';
