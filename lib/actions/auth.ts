"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient, createClient } from "@/lib/supabase/server";

const INTERNAL_LOGIN_DOMAIN = "users.qlcl.local";

function authEmail(identifier: string): string {
  const normalized = identifier.trim().toLowerCase();
  return normalized.includes("@")
    ? normalized
    : `${normalized}@${INTERNAL_LOGIN_DOMAIN}`;
}

export async function signIn(
  _prevState: { error: string } | null,
  formData: FormData,
): Promise<{ error: string } | null> {
  const identifier = String(
    formData.get("identifier") ?? formData.get("email") ?? "",
  ).trim();
  const password = String(formData.get("password") ?? "");

  if (!identifier || !password) {
    return { error: "Vui lòng nhập tên đăng nhập/email và mật khẩu." };
  }

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: authEmail(identifier),
    password,
  });

  if (error) {
    return { error: "Tên đăng nhập/email hoặc mật khẩu không đúng." };
  }

  revalidatePath("/", "layout");
  redirect("/");
}

export async function signUp(
  _prevState: { error?: string; success?: string } | null,
  formData: FormData,
): Promise<{ error?: string; success?: string } | null> {
  const fullName = String(formData.get("full_name") ?? "").trim();
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const passwordConfirmation = String(
    formData.get("password_confirmation") ?? "",
  );

  if (!fullName || !username || !password) {
    return { error: "Vui lòng nhập đầy đủ họ tên, tên đăng nhập và mật khẩu." };
  }
  if (!/^[a-z0-9._-]{3,32}$/.test(username)) {
    return {
      error:
        "Tên đăng nhập gồm 3–32 ký tự: chữ thường không dấu, số, dấu chấm, gạch dưới hoặc gạch ngang.",
    };
  }
  if (password.length < 6) {
    return { error: "Mật khẩu phải từ 6 ký tự trở lên." };
  }
  if (password !== passwordConfirmation) {
    return { error: "Mật khẩu xác nhận không khớp." };
  }

  const email = authEmail(username);
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, username },
  });

  if (error) {
    return {
      error: error.message.toLowerCase().includes("already")
        ? "Tên đăng nhập này đã tồn tại."
        : "Không đăng ký được tài khoản. Vui lòng thử lại.",
    };
  }

  const supabase = createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (!signInError) {
    revalidatePath("/", "layout");
    redirect("/");
  }

  return {
    success:
      "Đăng ký thành công với quyền Thành viên. Bạn có thể đăng nhập bằng tên đăng nhập vừa tạo.",
  };
}

export async function signOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
