import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/types";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll called from a Server Component — safe to ignore
            // because the proxy (proxy.ts) refreshes sessions on navigation.
          }
        },
      },
    }
  );
}

/**
 * Lấy user hiện tại cho Server Component bằng cách ĐỌC session từ cookie
 * (không gọi mạng tới Supabase Auth server).
 *
 * Vì sao an toàn để dùng ở đây: middleware (proxy.ts) đã gọi
 * `auth.getUser()` — xác thực CÓ gọi mạng, kiểm tra token còn hợp lệ —
 * cho MỌI request trước khi nó tới được Server Component. Nếu chưa đăng
 * nhập, middleware đã redirect sang /login từ trước rồi, nên Server
 * Component không cần xác thực lại lần 2.
 *
 * Gọi `getSession()` thay vì `getUser()` ở tầng này giúp bớt 1 network
 * round-trip mỗi lần vào trang — đây là nguyên nhân chính gây cảm giác
 * "vào chậm 2-3s" sau khi đăng nhập/đăng ký, vì trước đó mỗi trang lại tự
 * gọi getUser() thêm 1 lần nữa dù middleware vừa mới xác thực xong.
 */
export async function getSessionUser(supabase: SupabaseClient<Database>) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.user ?? null;
}
