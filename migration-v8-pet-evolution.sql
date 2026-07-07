-- ============================================================
-- Migration v8: hệ pet phong phú hơn — thêm loài mới + cột phụ kiện
-- Chạy 1 lần trong Supabase Dashboard → SQL Editor (an toàn, không mất dữ liệu cũ)
--
-- Lưu ý: KHÔNG cần cột riêng cho "nhánh tiến hóa" (variant) — nhánh được suy ra
-- ổn định từ id cặp đôi + loài ở phía code (lib/pets.ts#variantForCouple),
-- nên không tốn thêm chỗ lưu trữ và luôn nhất quán.
-- ============================================================

-- Mở rộng danh sách loài được phép (owl/otter/penguin vốn đã có trong UI nhưng
-- bị constraint cũ chặn — nay bổ sung thêm hamster/wolf/unicorn/koala).
alter table couples drop constraint if exists couples_pet_species_check;
alter table couples
  add constraint couples_pet_species_check
  check (pet_species in (
    'cat', 'fox', 'dragon', 'bunny', 'panda',
    'owl', 'otter', 'penguin',
    'hamster', 'wolf', 'unicorn', 'koala'
  ));

-- Phụ kiện / skin đang đeo trên pet.
alter table couples
  add column if not exists pet_accessory text not null default 'none';

alter table couples drop constraint if exists couples_pet_accessory_check;
alter table couples
  add constraint couples_pet_accessory_check
  check (pet_accessory in (
    'none', 'bowtie', 'sunglasses', 'flower_crown',
    'love_headband', 'wizard_hat', 'santa_hat', 'pumpkin_hat'
  ));
