-- ============================================================
-- Migration v5: PRESENCE (trạng thái hoạt động thật của đối phương)
-- Chạy 1 lần trong Supabase Dashboard → SQL Editor.
-- An toàn để chạy lại nhiều lần, không mất dữ liệu cũ.
-- ============================================================

alter table profiles add column if not exists last_seen timestamptz default now();

-- Policy update/select cho profiles đã cho phép user tự cập nhật hàng của
-- chính mình (update own profile) và cặp đôi xem hồ sơ của nhau
-- (select profiles of couple members) từ migration v3 — last_seen tự động
-- ăn theo các policy đó, không cần thêm policy mới.

-- Index nhỏ để truy vấn "đang hoạt động" nhanh hơn khi app lớn dần.
create index if not exists idx_profiles_last_seen on profiles (last_seen);
