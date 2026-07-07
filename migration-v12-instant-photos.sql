-- ============================================================
-- Migration v12: STORAGE BUCKET cho ảnh chụp tức thì (kiểu Locket,
-- khung tem răng cưa đã được bake sẵn vào file PNG lúc chụp).
-- Chạy 1 lần trong Supabase Dashboard → SQL Editor.
-- An toàn để chạy lại nhiều lần, không mất dữ liệu cũ.
--
-- Khác với "chat-images" (giữ nguyên byte gốc), ảnh ở đây LUÔN LÀ PNG
-- (để giữ alpha ở phần răng cưa đã khoét lỗ), dung lượng nhỏ hơn nhiều so
-- với ảnh upload thường nên giới hạn file cũng nhỏ hơn.
-- Đường dẫn lưu quy ước: {couple_id}/{uid}-{timestamp}.png
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit)
values ('instant-photos', 'instant-photos', true, 8388608) -- 8MB/ảnh
on conflict (id) do update set file_size_limit = excluded.file_size_limit;

drop policy if exists "instant photo public read" on storage.objects;
drop policy if exists "instant photo member upload" on storage.objects;
drop policy if exists "instant photo member delete" on storage.objects;

-- Ai cũng đọc được ảnh (public bucket, cần để hiện ảnh trong bong bóng chat)
create policy "instant photo public read" on storage.objects
  for select using (bucket_id = 'instant-photos');

-- Chỉ 2 người trong couple đó mới được upload ảnh vào đúng thư mục couple_id của họ
create policy "instant photo member upload" on storage.objects
  for insert with check (
    bucket_id = 'instant-photos'
    and exists (
      select 1 from couples
      where couples.id::text = (storage.foldername(name))[1]
        and (couples.user1_id = auth.uid() or couples.user2_id = auth.uid())
    )
  );

-- Cho phép người gửi xoá lại ảnh của chính mình nếu cần (tên file có uid ở giữa)
create policy "instant photo member delete" on storage.objects
  for delete using (
    bucket_id = 'instant-photos'
    and exists (
      select 1 from couples
      where couples.id::text = (storage.foldername(name))[1]
        and (couples.user1_id = auth.uid() or couples.user2_id = auth.uid())
    )
  );
