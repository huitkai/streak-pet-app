-- ============================================================
-- Migration v4: STORAGE BUCKET cho ảnh gửi trong chat
-- Chạy 1 lần trong Supabase Dashboard → SQL Editor.
-- An toàn để chạy lại nhiều lần, không mất dữ liệu cũ.
--
-- Ảnh được upload THẲNG từ trình duyệt lên Storage, giữ nguyên byte gốc của
-- file (không qua bước nén/resize nào ở server) -> chất lượng ảnh gốc 100%.
-- Đường dẫn lưu quy ước: {couple_id}/{uid}-{timestamp}.{ext}
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit)
values ('chat-images', 'chat-images', true, 15728640) -- 15MB/ảnh
on conflict (id) do update set file_size_limit = excluded.file_size_limit;

drop policy if exists "chat image public read" on storage.objects;
drop policy if exists "chat image member upload" on storage.objects;
drop policy if exists "chat image member delete" on storage.objects;

-- Ai cũng đọc được ảnh (public bucket, cần để hiện ảnh trong bong bóng chat)
create policy "chat image public read" on storage.objects
  for select using (bucket_id = 'chat-images');

-- Chỉ 2 người trong couple đó mới được upload ảnh vào đúng thư mục couple_id của họ
create policy "chat image member upload" on storage.objects
  for insert with check (
    bucket_id = 'chat-images'
    and exists (
      select 1 from couples
      where couples.id::text = (storage.foldername(name))[1]
        and (couples.user1_id = auth.uid() or couples.user2_id = auth.uid())
    )
  );

-- Cho phép người gửi xoá lại ảnh của chính mình nếu cần (tên file có uid ở giữa)
create policy "chat image member delete" on storage.objects
  for delete using (
    bucket_id = 'chat-images'
    and exists (
      select 1 from couples
      where couples.id::text = (storage.foldername(name))[1]
        and (couples.user1_id = auth.uid() or couples.user2_id = auth.uid())
    )
  );
