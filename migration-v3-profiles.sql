-- ============================================================
-- Migration v3: PROFILES + AVATAR
-- Chạy 1 lần trong Supabase Dashboard → SQL Editor
-- An toàn để chạy lại nhiều lần, không mất dữ liệu cũ.
-- ============================================================

-- ---------- 1. Bảng profiles (1 dòng / user) ----------
create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text,
  avatar_url text,
  updated_at timestamptz default now()
);

alter table profiles enable row level security;

drop policy if exists "select profiles of couple members" on profiles;
drop policy if exists "update own profile" on profiles;
drop policy if exists "insert own profile" on profiles;

-- Cho phép xem profile của chính mình VÀ của người trong cùng couple
create policy "select profiles of couple members" on profiles
  for select using (
    id = auth.uid()
    or exists (
      select 1 from couples
      where (user1_id = auth.uid() or user2_id = auth.uid())
        and (user1_id = profiles.id or user2_id = profiles.id)
    )
  );

create policy "insert own profile" on profiles
  for insert with check (id = auth.uid());

create policy "update own profile" on profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- ---------- 2. Tự tạo profile khi có user mới đăng ký ----------
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into profiles (id, display_name)
  values (new.id, split_part(new.email, '@', 1))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- Tạo profile cho các user đã tồn tại từ trước (chạy 1 lần)
insert into profiles (id, display_name)
select id, split_part(email, '@', 1) from auth.users
on conflict (id) do nothing;

-- ---------- 3. Bật realtime cho profiles (để cả 2 người thấy avatar cập nhật ngay) ----------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'profiles'
  ) then
    alter publication supabase_realtime add table profiles;
  end if;
end $$;

-- ============================================================
-- 4. STORAGE BUCKET cho avatar
-- Lưu ý: nếu Storage Editor đã có bucket "avatars" rồi thì bỏ qua dòng insert.
-- ============================================================
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "avatar public read" on storage.objects;
drop policy if exists "avatar owner upload" on storage.objects;
drop policy if exists "avatar owner update" on storage.objects;
drop policy if exists "avatar owner delete" on storage.objects;

-- Ai cũng đọc được avatar (public bucket, dùng để hiện ảnh trong chat)
create policy "avatar public read" on storage.objects
  for select using (bucket_id = 'avatars');

-- Chỉ chủ sở hữu (tên file bắt đầu bằng uid của họ) mới được up/sửa/xoá
create policy "avatar owner upload" on storage.objects
  for insert with check (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatar owner update" on storage.objects
  for update using (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatar owner delete" on storage.objects
  for delete using (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );
