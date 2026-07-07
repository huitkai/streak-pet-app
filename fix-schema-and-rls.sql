-- ============================================================
-- MASTER FIX — chạy 1 lần trong Supabase SQL Editor
-- An toàn để chạy lại nhiều lần, KHÔNG làm mất dữ liệu hiện có.
-- Sửa 2 vấn đề:
--   1) Bảng "streaks" đang thiếu cột progress_date/user1_sent_today/
--      user2_sent_today mà code cần → phải thêm vào
--   2) Policy RLS cho phép insert/update trên couples/streaks/pets/
--      messages có thể chưa tồn tại hoặc bị thiếu → xoá và tạo lại
--      từ đầu cho chắc chắn
-- ============================================================

-- ---------- 1. Bổ sung cột còn thiếu ----------
alter table couples
  add column if not exists pet_name text not null default 'Pet';

alter table streaks
  add column if not exists progress_date date,
  add column if not exists user1_sent_today boolean not null default false,
  add column if not exists user2_sent_today boolean not null default false;

-- ---------- 2. Bật RLS trên tất cả bảng ----------
alter table couples  enable row level security;
alter table messages enable row level security;
alter table streaks  enable row level security;
alter table pets     enable row level security;

-- ---------- 3. Hàm phụ trợ: kiểm tra có phải thành viên couple không ----------
create or replace function is_couple_member(target_couple_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from couples
    where id = target_couple_id
      and (user1_id = auth.uid() or user2_id = auth.uid())
  );
$$;

-- ---------- 4. Xoá toàn bộ policy cũ (nếu có) ----------
drop policy if exists "select own couple" on couples;
drop policy if exists "insert couple as creator" on couples;
drop policy if exists "join couple as user2" on couples;

drop policy if exists "select messages of own couple" on messages;
drop policy if exists "insert messages as sender in own couple" on messages;

drop policy if exists "select streak of own couple" on streaks;
drop policy if exists "update streak of own couple" on streaks;
drop policy if exists "insert streak of own couple" on streaks;

drop policy if exists "select pet of own couple" on pets;
drop policy if exists "update pet of own couple" on pets;
drop policy if exists "insert pet of own couple" on pets;

-- ---------- 5. Tạo lại toàn bộ policy ----------
create policy "select own couple" on couples
  for select using (user1_id = auth.uid() or user2_id = auth.uid());

create policy "insert couple as creator" on couples
  for insert with check (user1_id = auth.uid());

create policy "join couple as user2" on couples
  for update using (user2_id is null)
  with check (user2_id = auth.uid());

create policy "select messages of own couple" on messages
  for select using (is_couple_member(couple_id));

create policy "insert messages as sender in own couple" on messages
  for insert with check (sender_id = auth.uid() and is_couple_member(couple_id));

create policy "select streak of own couple" on streaks
  for select using (is_couple_member(couple_id));

create policy "update streak of own couple" on streaks
  for update using (is_couple_member(couple_id));

create policy "insert streak of own couple" on streaks
  for insert with check (is_couple_member(couple_id));

create policy "select pet of own couple" on pets
  for select using (is_couple_member(couple_id));

create policy "update pet of own couple" on pets
  for update using (is_couple_member(couple_id));

create policy "insert pet of own couple" on pets
  for insert with check (is_couple_member(couple_id));

-- ---------- 6. Đảm bảo trigger tự tạo streak/pet khi có couple mới ----------
create or replace function handle_new_couple()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into streaks (couple_id) values (new.id)
  on conflict (couple_id) do nothing;
  insert into pets (couple_id) values (new.id)
  on conflict (couple_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_couple_created on couples;
create trigger on_couple_created
  after insert on couples
  for each row execute procedure handle_new_couple();

-- ---------- 7. Đảm bảo realtime bật cho 3 bảng ----------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table messages;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'streaks'
  ) then
    alter publication supabase_realtime add table streaks;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'pets'
  ) then
    alter publication supabase_realtime add table pets;
  end if;
end $$;

-- ---------- 8. KIỂM TRA KẾT QUẢ ----------
-- Chạy riêng khối này để xem danh sách policy đã tạo (phải có đủ 11 dòng)
select tablename, policyname, cmd
from pg_policies
where tablename in ('couples', 'messages', 'streaks', 'pets')
order by tablename, cmd;
