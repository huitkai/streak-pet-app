-- ============================================================
-- Migration v10: trạng thái "đã nhận" (delivered) — tách khỏi "đã xem" (read)
-- Chạy 1 lần trong Supabase Dashboard → SQL Editor (an toàn, không mất dữ liệu cũ)
--
-- Bối cảnh: ghi chú kỹ thuật để lại ở mục 2 của KE-HOACH-NANG-CAP.md — app
-- trước đây chỉ có 1 mốc `message_reads.last_read_at` nên không thể phân
-- biệt "tin đã tới máy đối phương nhưng họ chưa mở app" (delivered) với
-- "họ đã thực sự mở ra xem" (read), khác với Messenger/Zalo/WhatsApp có 2
-- nấc tick riêng.
--
-- Thiết kế: 1 bảng `message_deliveries` CÙNG HÌNH DẠNG với `message_reads`
-- (couple_id, user_id, last_delivered_at) thay vì 1 cột delivered_at trên
-- từng dòng `messages` — lý do:
--   1) Nhất quán với cách `message_reads` đang hoạt động (1 mốc thời gian
--      cắt lát cho MỌI tin nhắn <= mốc đó, thay vì phải UPDATE từng dòng
--      `messages` mỗi lần 1 tin được nhận — tốn ghi hơn nhiều khi lịch sử
--      chat dài).
--   2) Tái dùng nguyên logic client hiện có cho `partnerLastReadAt` (so
--      sánh `m.created_at <= mốc`) cho cả `partnerLastDeliveredAt`, chỉ
--      khác nhau ở THỜI ĐIỂM client gọi API set mốc (xem lib/actions.ts:
--      markMessagesDelivered gọi ngay khi nhận realtime bất kể tab có đang
--      hiện hay không, còn markMessagesRead vẫn giữ nguyên hành vi cũ là chỉ
--      gọi khi document.visibilityState === "visible").
-- ============================================================

create table if not exists message_deliveries (
  couple_id uuid references couples not null,
  user_id uuid references auth.users not null,
  last_delivered_at timestamptz not null default now(),
  primary key (couple_id, user_id)
);

alter table message_deliveries enable row level security;

drop policy if exists "select deliveries of own couple" on message_deliveries;
drop policy if exists "upsert own delivery state" on message_deliveries;
drop policy if exists "update own delivery state" on message_deliveries;

create policy "select deliveries of own couple" on message_deliveries
  for select using (is_couple_member(couple_id));

create policy "upsert own delivery state" on message_deliveries
  for insert with check (user_id = auth.uid() and is_couple_member(couple_id));

create policy "update own delivery state" on message_deliveries
  for update using (user_id = auth.uid() and is_couple_member(couple_id));

-- Bật realtime để ChatBox biết ngay khi đối phương nhận được tin (đổi tick
-- đơn -> tick đúp xám), giống hệt cách message_reads đang phát realtime.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'message_deliveries'
  ) then
    alter publication supabase_realtime add table message_deliveries;
  end if;
end $$;
