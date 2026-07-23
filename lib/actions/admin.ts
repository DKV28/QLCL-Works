"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/data/profiles";
import type { Role } from "@/lib/types";

export type ActionResult = { ok: true } | { ok: false; error: string };

async function requireAdmin(): Promise<ActionResult> {
  const me = await getCurrentProfile();
  if (!me || me.role !== "admin") {
    return { ok: false, error: "Bạn không có quyền thực hiện thao tác này." };
  }
  return { ok: true };
}

/** Tạo tài khoản mới (chỉ admin). Dùng service role, xác nhận email luôn. */
export async function createUserAction(
  formData: FormData,
): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard;

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("full_name") ?? "").trim();
  const role = (String(formData.get("role") ?? "staff") || "staff") as Role;

  if (!email || !password) {
    return { ok: false, error: "Vui lòng nhập email và mật khẩu." };
  }
  if (password.length < 6) {
    return { ok: false, error: "Mật khẩu phải từ 6 ký tự trở lên." };
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName || email, role },
  });

  if (error) {
    return {
      ok: false,
      error: error.message.includes("already")
        ? "Email này đã tồn tại."
        : "Không tạo được tài khoản. Vui lòng thử lại.",
    };
  }

  revalidatePath("/quan-tri/nguoi-dung");
  return { ok: true };
}

/** Đổi vai trò của một người dùng (chỉ admin). */
export async function updateUserRoleAction(
  userId: string,
  role: Role,
): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard;

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ role })
    .eq("id", userId);

  if (error) return { ok: false, error: "Không cập nhật được vai trò." };

  revalidatePath("/quan-tri/nguoi-dung");
  return { ok: true };
}
