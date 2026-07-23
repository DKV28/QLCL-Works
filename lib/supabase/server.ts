// Supabase client dùng ở phía server (server components, route handlers,
// server actions). Đọc/ghi cookie phiên đăng nhập.
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export function createClient() {
  // Gọi cookies() trước để Next đánh dấu route là dynamic (render lúc request),
  // tránh việc prerender lúc build gặp lỗi thiếu env.
  const cookieStore = cookies();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    throw new Error(
      "Chưa cấu hình biến môi trường Supabase. Vui lòng đặt NEXT_PUBLIC_SUPABASE_URL " +
        "và NEXT_PUBLIC_SUPABASE_ANON_KEY (trong .env.local khi chạy local, hoặc " +
        "Environment Variables trên Vercel rồi redeploy).",
    );
  }

  return createServerClient(url, anon, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(
          cookiesToSet: { name: string; value: string; options?: CookieOptions }[],
        ) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Được gọi từ Server Component — bỏ qua, middleware sẽ làm mới phiên.
          }
        },
      },
    },
  );
}

// Client quyền admin (service role) — CHỈ dùng trong server actions quản trị.
// Bỏ qua RLS, tuyệt đối không dùng ở client.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "Chưa cấu hình SUPABASE_SERVICE_ROLE_KEY (và/hoặc NEXT_PUBLIC_SUPABASE_URL). " +
        "Cần cho thao tác quản trị (tạo tài khoản). Đặt biến môi trường rồi redeploy.",
    );
  }

  return createSupabaseClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
