-- ============================================================
-- Migration v7: REPLY / EDIT / RECALL / PIN / FORWARD
-- Chạy 1 lần trong Supabase Dashboard → SQL Editor.
-- An toàn để chạy lại nhiều lần, không mất dữ liệu cũ.
-- ============================================================

-- ---------- 1. Cột mới trên bảng messages ----------
alter table messages
  add column if not exists reply_to_id uuid references messages(id) on delete set null,
  add column if not exists forwarded_from_id uuid references messages(id) on delete set null,
  add column if not exists edited_at timestamptz,
  add column if not exists deleted_at timestamptz; -- "thu hồi" (gỡ với cả 2 người)

create index if not exists idx_messages_reply_to on messages (reply_to_id);

-- ---------- 2. "Xoá chỉ ở phía tôi" — không đụng tới bản ghi gốc ----------
create table if not exists message_hidden (
  message_id uuid references messages(id) on delete cascade not null,
  user_id uuid references auth.users not null,
  hidden_at timestamptz not null default now(),
  primary key (message_id, user_id)
);

alter table message_hidden enable row level security;

drop policy if exists "manage own hidden messages" on message_hidden;
create policy "manage own hidden messages" on message_hidden
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- 3. Ghim tin nhắn ----------
create table if not exists pinned_messages (
  couple_id uuid references couples not null,
  message_id uuid references messages(id) on delete cascade not null,
  pinned_by uuid references auth.users not null,
  pinned_at timestamptz not null default now(),
  primary key (couple_id, message_id)
);

create index if not exists idx_pinned_messages_couple on pinned_messages (couple_id);

alter table pinned_messages enable row level security;

drop policy if exists "select pins of own couple" on pinned_messages;
drop policy if exists "insert pin in own couple" on pinned_messages;
drop policy if exists "delete pin in own couple" on pinned_messages;

create policy "select pins of own couple" on pinned_messages
  for select using (is_couple_member(couple_id));

create policy "insert pin in own couple" on pinned_messages
  for insert with check (pinned_by = auth.uid() and is_couple_member(couple_id));

create policy "delete pin in own couple" on pinned_messages
  for delete using (is_couple_member(couple_id));

-- ---------- 4. Cho phép sender UPDATE tin nhắn của chính mình ----------
-- (cần cho sửa tin / thu hồi tin — trước đây chỉ có policy insert + select)
drop policy if exists "update own messages" on messages;
create policy "update own messages" on messages
  for update using (sender_id = auth.uid() and is_couple_member(couple_id))
  with check (sender_id = auth.uid() and is_couple_member(couple_id));

-- ---------- 5. Bật realtime cho các bảng mới + UPDATE trên messages ----------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'pinned_messages'
  ) then
    alter publication supabase_realtime add table pinned_messages;
  end if;
end $$;

-- messages đã nằm trong publication từ trước (cho INSERT); publication mặc
-- định phát mọi loại sự kiện (insert/update/delete) một khi bảng đã được
-- thêm, nên KHÔNG cần thêm lại — chỉ cần đảm bảo bảng đã có trong publication:
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table messages;
  end if;
end $$;

-- ============================================================
-- 6. STORAGE BUCKET cho tin nhắn thoại
-- ============================================================
insert into storage.buckets (id, name, public)
values ('chat-voice', 'chat-voice', true)
on conflict (id) do nothing;

drop policy if exists "voice public read" on storage.objects;
drop policy if exists "voice member upload" on storage.objects;

create policy "voice public read" on storage.objects
  for select using (bucket_id = 'chat-voice');

-- Thư mục lưu theo coupleId — chỉ thành viên couple đó mới upload được.
create policy "voice member upload" on storage.objects
  for insert with check (
    bucket_id = 'chat-voice'
    and is_couple_member(((storage.foldername(name))[1])::uuid)
  );
