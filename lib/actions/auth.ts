"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signIn(
  _prevState: { error: string } | null,
  formData: FormData,
): Promise<{ error: string } | null> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Vui lòng nhập email và mật khẩu." };
  }

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "Email hoặc mật khẩu không đúng." };
  }

  revalidatePath("/", "layout");
  redirect("/");
}

export async function signUp(
  _prevState: { error?: string; success?: string } | null,
  formData: FormData,
): Promise<{ error?: string; success?: string } | null> {
  const fullName = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const passwordConfirmation = String(
    formData.get("password_confirmation") ?? "",
  );

  if (!fullName || !email || !password) {
    return { error: "Vui lòng nhập đầy đủ họ tên, email và mật khẩu." };
  }
  if (password.length < 6) {
    return { error: "Mật khẩu phải từ 6 ký tự trở lên." };
  }
  if (password !== passwordConfirmation) {
    return { error: "Mật khẩu xác nhận không khớp." };
  }

  const supabase = createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
    },
  });

  if (error) {
    return {
      error: error.message.toLowerCase().includes("already")
        ? "Email này đã được đăng ký."
        : "Không đăng ký được tài khoản. Vui lòng thử lại.",
    };
  }

  if (data.session) {
    revalidatePath("/", "layout");
    redirect("/");
  }

  return {
    success:
      "Đăng ký thành công với quyền Thành viên. Vui lòng kiểm tra email để xác nhận tài khoản.",
  };
}

export async function signOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
