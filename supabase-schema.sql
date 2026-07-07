-- ============================================================
-- Streak & Pet App — Supabase schema
-- Chạy toàn bộ file này trong Supabase Dashboard → SQL Editor
-- ============================================================

-- ---------- COUPLES ----------
create table if not exists couples (
  id uuid primary key default gen_random_uuid(),
  user1_id uuid references auth.users not null,
  user2_id uuid references auth.users,
  invite_code text unique not null,
  pet_name text not null default 'Pet',
  created_at timestamptz default now()
);

-- ---------- MESSAGES ----------
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid references couples not null,
  sender_id uuid references auth.users not null,
  content text not null,
  created_at timestamptz default now()
);

-- ---------- STREAKS ----------
create table if not exists streaks (
  couple_id uuid primary key references couples,
  current_streak int not null default 0,
  longest_streak int not null default 0,
  last_active_date date,
  progress_date date,
  user1_sent_today boolean not null default false,
  user2_sent_today boolean not null default false,
  updated_at timestamptz default now()
);

-- ---------- PETS ----------
create table if not exists pets (
  couple_id uuid primary key references couples,
  stage text not null default 'egg',   -- egg | baby | teen | adult | legendary
  mood text not null default 'happy',  -- happy | neutral | sad | sick
  updated_at timestamptz default now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table couples  enable row level security;
alter table messages enable row level security;
alter table streaks  enable row level security;
alter table pets     enable row level security;

-- Helper: is the current user a member of this couple?
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

-- ---------- couples policies ----------
create policy "select own couple" on couples
  for select using (
    user1_id = auth.uid()
    or user2_id = auth.uid()
    or user2_id is null  -- cho phép tìm couple "mở" (chưa ghép đôi) bằng invite_code
  );

create policy "insert couple as creator" on couples
  for insert with check (user1_id = auth.uid());

create policy "join couple as user2" on couples
  for update using (user2_id is null)
  with check (user2_id = auth.uid());

-- ---------- messages policies ----------
create policy "select messages of own couple" on messages
  for select using (is_couple_member(couple_id));

create policy "insert messages as sender in own couple" on messages
  for insert with check (sender_id = auth.uid() and is_couple_member(couple_id));

-- ---------- streaks policies ----------
create policy "select streak of own couple" on streaks
  for select using (is_couple_member(couple_id));

create policy "update streak of own couple" on streaks
  for update using (is_couple_member(couple_id));

create policy "insert streak of own couple" on streaks
  for insert with check (is_couple_member(couple_id));

-- ---------- pets policies ----------
create policy "select pet of own couple" on pets
  for select using (is_couple_member(couple_id));

create policy "update pet of own couple" on pets
  for update using (is_couple_member(couple_id));

create policy "insert pet of own couple" on pets
  for insert with check (is_couple_member(couple_id));

-- ============================================================
-- REALTIME
-- ============================================================
alter publication supabase_realtime add table messages;
alter publication supabase_realtime add table streaks;
alter publication supabase_realtime add table pets;

-- ============================================================
-- Auto-create streak + pet rows whenever a couple is created
-- ============================================================
create or replace function handle_new_couple()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into streaks (couple_id) values (new.id);
  insert into pets (couple_id) values (new.id);
  return new;
end;
$$;

create trigger on_couple_created
  after insert on couples
  for each row execute procedure handle_new_couple();
