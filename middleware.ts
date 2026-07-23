// Middleware làm mới phiên đăng nhập Supabase trên mỗi request và
// chặn truy cập khu vực app khi chưa đăng nhập.
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Thiếu cấu hình Supabase -> không thể xác thực. Cho request đi tiếp thay vì
  // để createServerClient ném lỗi (gây 500 MIDDLEWARE_INVOCATION_FAILED toàn app).
  // Trang tĩnh /login vẫn mở được; các trang cần dữ liệu do guard tầng page xử lý.
  if (!url || !anon) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, anon, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: { name: string; value: string; options?: CookieOptions }[],
        ) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Lỗi mạng/tạm thời khi gọi Supabase -> coi như chưa đăng nhập, không crash.
  let user = null;
  try {
    const res = await supabase.auth.getUser();
    user = res.data.user;
  } catch {
    user = null;
  }

  const path = request.nextUrl.pathname;
  const isPublic =
    path === "/login" ||
    path.startsWith("/api/health") ||
    path.startsWith("/_next") ||
    path.startsWith("/favicon");

  // Chưa đăng nhập mà vào khu vực bảo vệ -> đẩy về /login
  if (!user && !isPublic) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    return NextResponse.redirect(redirectUrl);
  }

  // Đã đăng nhập mà vào /login -> đẩy về trang chủ
  if (user && path === "/login") {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/";
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
