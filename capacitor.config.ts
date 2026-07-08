import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Capacitor bọc trang web ĐÃ DEPLOY (pp.onrender.com) vào 1 WebView native
 * -> ra APK cài được như app thật (icon riêng, splash screen, full màn
 * hình, không thanh địa chỉ) — giống cảm giác mở Messenger/Instagram.
 *
 * QUAN TRỌNG: server.url trỏ THẲNG vào domain đang chạy (Next.js server
 * actions, Supabase auth, upload ảnh... đều cần chạy trên server thật, KHÔNG
 * thể "next export" ra site tĩnh rồi nhét vào APK). Vì vậy app Android này
 * vẫn cần Internet để hoạt động — đúng như Messenger/Instagram cũng cần
 * mạng để chạy, không phải app "offline-first".
 *
 * Nếu sau này đổi domain (ví dụ mua domain riêng), chỉ cần sửa lại đúng 1
 * dòng server.url bên dưới rồi build lại APK.
 */
const config: CapacitorConfig = {
  appId: "com.streakpet.app",
  appName: "Streak & Pet",
  webDir: "public",
  server: {
    url: "https://pp.onrender.com",
    // Cho phép WebView điều hướng đúng domain của app + domain Supabase (ảnh,
    // API) mà không bị Android chặn vì lý do "domain lạ".
    allowNavigation: ["pp.onrender.com", "*.supabase.co"],
  },
  android: {
    // Bắt buộc để tính năng "Chụp nhanh" (getUserMedia) hoạt động qua HTTPS
    // trong WebView, giống hệt lúc chạy trên Chrome trình duyệt.
    allowMixedContent: false,
  },
};

export default config;
