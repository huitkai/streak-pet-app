-- ============================================================
-- Migration v6: TRẠNG THÁI TIN NHẮN (đã xem) + THẢ CẢM XÚC
-- Chạy 1 lần trong Supabase Dashboard → SQL Editor.
-- An toàn để chạy lại nhiều lần, không mất dữ liệu cũ.
--
-- Thêm 2 bảng:
--   1) message_reads      — mỗi user lưu 1 dòng "mình đã đọc tới lúc nào"
--                           cho mỗi couple -> suy ra tin nào đối phương ĐÃ XEM.
--   2) message_reactions  — mỗi user thả tối đa 1 cảm xúc / 1 tin nhắn
--                           (thả lại cảm xúc khác -> thay thế, thả lại cùng
--                           cảm xúc -> bỏ thả, giống Messenger).
--
-- Việc "đang nhập..." KHÔNG cần bảng riêng — dùng Supabase Realtime
-- Broadcast (ephemeral, không ghi DB) trên kênh `typing-{coupleId}`.
-- ============================================================

-- ---------- 1. Bảng message_reads ----------
create table if not exists message_reads (
  couple_id uuid references couples not null,
  user_id uuid references auth.users not null,
  last_read_at timestamptz not null default now(),
  primary key (couple_id, user_id)
);

alter table message_reads enable row level security;

drop policy if exists "select reads of own couple" on message_reads;
drop policy if exists "upsert own read state" on message_reads;
drop policy if exists "update own read state" on message_reads;

create policy "select reads of own couple" on message_reads
  for select using (is_couple_member(couple_id));

create policy "upsert own read state" on message_reads
  for insert with check (user_id = auth.uid() and is_couple_member(couple_id));

create policy "update own read state" on message_reads
  for update using (user_id = auth.uid() and is_couple_member(couple_id));

-- ---------- 2. Bảng message_reactions ----------
create table if not exists message_reactions (
  id uuid primary key default gen_random_uuid(),
  message_id uuid references messages(id) on delete cascade not null,
  couple_id uuid references couples not null,
  user_id uuid references auth.users not null,
  emoji text not null,
  created_at timestamptz not null default now(),
  unique (message_id, user_id)
);

create index if not exists idx_message_reactions_couple on message_reactions (couple_id);
create index if not exists idx_message_reactions_message on message_reactions (message_id);

alter table message_reactions enable row level security;

drop policy if exists "select reactions of own couple" on message_reactions;
drop policy if exists "insert own reaction" on message_reactions;
drop policy if exists "update own reaction" on message_reactions;
drop policy if exists "delete own reaction" on message_reactions;

create policy "select reactions of own couple" on message_reactions
  for select using (is_couple_member(couple_id));

create policy "insert own reaction" on message_reactions
  for insert with check (user_id = auth.uid() and is_couple_member(couple_id));

create policy "update own reaction" on message_reactions
  for update using (user_id = auth.uid() and is_couple_member(couple_id));

create policy "delete own reaction" on message_reactions
  for delete using (user_id = auth.uid());

-- ---------- 3. Bật realtime cho 2 bảng mới ----------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'message_reads'
  ) then
    alter publication supabase_realtime add table message_reads;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'message_reactions'
  ) then
    alter publication supabase_realtime add table message_reactions;
  end if;
end $$;
