# Streak & Pet 💌🐣

Web app nhắn tin cho 2 người, có chuỗi ngày (streak) và pet lớn lên/tiến hóa
theo chuỗi. Chạy Next.js 16 (App Router) + Supabase, deploy trên Render,
dùng như PWA trên iPhone (Add to Home Screen) để khỏi cần build app native.

## 1. Setup Supabase

1. Tạo project mới tại supabase.com
2. Vào **SQL Editor**, dán toàn bộ nội dung file `supabase-schema.sql` và
   chạy (tạo bảng `couples`, `messages`, `streaks`, `pets`, RLS, realtime,
   trigger tự tạo streak/pet khi có couple mới)
3. Vào **Settings → API**, lấy `Project URL` và `anon public key`
4. Vào **Authentication → Providers**, đảm bảo Email/Password đang bật.
   Nếu muốn test nhanh, có thể tắt "Confirm email" ở
   **Authentication → Settings** để khỏi cần xác nhận email khi đăng ký.

## 2. Chạy local

\`\`\`bash
npm install
cp .env.example .env.local
# rồi điền NEXT_PUBLIC_SUPABASE_URL và NEXT_PUBLIC_SUPABASE_ANON_KEY
npm run dev
\`\`\`

Mở http://localhost:3000

## 3. Luồng sử dụng

1. Cả 2 người tự đăng ký tài khoản (`/signup`)
2. Người 1 vào `/couple` → "Tạo cặp đôi mới" → nhận mã mời 6 ký tự
3. Người 2 vào `/couple` → nhập mã mời → ghép cặp thành công
4. Cả 2 vào `/chat`: nhắn tin, xem streak và pet

**Luật giữ streak**: mỗi ngày cả 2 người đều phải gửi ít nhất 1 tin nhắn thì
streak mới +1. Nếu bỏ lỡ trọn 1 ngày không ai nhắn, streak reset về 0 và pet
buồn (nhưng không "chết" hẳn — nhân văn hơn TikTok 😄). Pet tiến hóa qua các
mốc: 🥚 Trứng (0-7) → 🐣 Con non (8-29) → 🐥 Thiếu niên (30-99) →
🦅 Trưởng thành (100-299) → 🐉 Huyền thoại (300+).

*Lưu ý: ngày được tính theo giờ UTC để đơn giản hoá; có thể chỉnh lại theo
múi giờ Việt Nam (UTC+7) trong `lib/actions.ts` nếu cần chính xác hơn.*

## 4. Deploy lên Render

1. Push code lên GitHub
2. Trên Render: **New → Web Service** → connect repo
3. Điền:
   - **Language**: Node
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start`
4. Thêm **Environment Variables**: `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY` (lấy từ Supabase, không commit file
   `.env.local` lên Git)
5. Deploy — Render tự build lại mỗi khi bạn push code mới

## 5. Cài lên iPhone như app thật (PWA)

App đã có sẵn `manifest.json` + meta tag Apple. Trên iPhone (Safari):

1. Mở link Render của app
2. Bấm nút **Share** (hình vuông có mũi tên lên)
3. Chọn **"Add to Home Screen"**
4. Icon sẽ xuất hiện trên màn hình chính, mở full-screen như app thật

*Icon trong `public/icons/` hiện là icon tạm (placeholder) — bạn nên thay
bằng icon 192×192 và 512×512 riêng của mình trước khi dùng thật.*

## 6. Cấu trúc project

\`\`\`
app/
  page.tsx          -> điều hướng theo trạng thái đăng nhập/couple
  login/page.tsx
  signup/page.tsx
  couple/page.tsx    -> tạo/tham gia cặp đôi bằng mã mời
  chat/page.tsx       -> màn hình chính: pet + streak + chat
components/
  ChatBox.tsx         -> realtime chat
  PetDisplay.tsx       -> realtime pet
  StreakCounter.tsx    -> realtime streak
  SignOutButton.tsx
lib/
  supabase/client.ts   -> Supabase client (browser)
  supabase/server.ts   -> Supabase client (server components/actions)
  actions.ts            -> server actions: auth, couple, sendMessage, streak logic
  pet-logic.ts           -> quy tắc tiến hóa pet
  types.ts
proxy.ts                -> (Next.js 16 đổi tên middleware.ts -> proxy.ts)
                            refresh session + bảo vệ route
supabase-schema.sql       -> toàn bộ SQL schema + RLS
\`\`\`

## 7. Việc có thể làm thêm

- Thay icon PWA bằng icon riêng
- Đổi timezone tính "ngày" từ UTC sang UTC+7
- Thêm push notification nhắc nhau giữ streak (Web Push, iOS 16.4+ đã hỗ trợ
  trên PWA "Add to Home Screen")
- Thêm màn hình đổi tên pet
