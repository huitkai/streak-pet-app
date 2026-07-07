-- ============================================================
-- Migration v2: thêm lựa chọn LOÀI pet (species)
-- Chạy 1 lần trong Supabase Dashboard → SQL Editor (an toàn, không mất dữ liệu cũ)
-- ============================================================

alter table couples
  add column if not exists pet_species text not null default 'cat';

-- (tuỳ chọn) ràng buộc chỉ cho phép các loài đã hỗ trợ
alter table couples drop constraint if exists couples_pet_species_check;
alter table couples
  add constraint couples_pet_species_check
  check (pet_species in ('cat', 'fox', 'dragon', 'bunny', 'panda'));
