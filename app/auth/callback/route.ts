import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Điểm đến của link xác nhận email (và magic link / reset mật khẩu) từ Supabase.
 *
 * Supabase gửi email chứa link trỏ về `${emailRedirectTo}?code=...`.
 * Route này đổi `code` lấy session thật, set cookie đăng nhập, rồi điều
 * hướng người dùng vào thẳng app — không cần đăng nhập lại lần nữa.
 *
 * Quan trọng: URL gốc (`${site}/auth/callback`) phải khớp với domain đã khai
 * báo trong Supabase Dashboard -> Authentication -> URL Configuration.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const errorDescription = searchParams.get("error_description");

  if (errorDescription) {
    const url = new URL("/login", origin);
    url.searchParams.set("error", errorDescription);
    return NextResponse.redirect(url);
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const url = new URL("/", origin);
      url.searchParams.set("confirmed", "1");
      return NextResponse.redirect(url);
    }

    const url = new URL("/login", origin);
    url.searchParams.set("error", "Link xác nhận đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại.");
    return NextResponse.redirect(url);
  }

  return NextResponse.redirect(new URL("/login", origin));
}
