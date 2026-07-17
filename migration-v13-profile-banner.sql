-- ============================================================
-- Migration v13: Thêm banner_url cho trang hồ sơ (ảnh bìa riêng,
-- khác với avatar_url). Chạy 1 lần trong Supabase Dashboard → SQL Editor.
-- An toàn để chạy lại nhiều lần, không mất dữ liệu cũ.
-- ============================================================

alter table profiles
  add column if not exists banner_url text;

-- Dùng chung bucket "avatars" (đã có sẵn policy public read + member upload
-- theo đúng userId của chính họ) để không phải tạo thêm bucket/policy mới.
-- Ảnh bìa lưu tại path: {userId}/banner.{ext}
