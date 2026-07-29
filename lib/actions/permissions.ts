"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/data/profiles";
import { updateRolePermission } from "@/lib/data/permissions";
import type { EditScope, PermissionResource, Role } from "@/lib/types";

export type ActionResult = { ok: true } | { ok: false; error: string };

const SCOPES: EditScope[] = ["all", "own", "none"];
const RESOURCES: PermissionResource[] = ["project", "task"];
const ROLES: Role[] = ["admin", "manager", "staff"];

export async function updateRolePermissionAction(
  resource: PermissionResource,
  role: Role,
  input: { edit_scope: EditScope; can_create: boolean },
): Promise<ActionResult> {
  const me = await getCurrentProfile();
  if (!me || me.role !== "admin") {
    return { ok: false, error: "Chỉ Quản trị viên được đổi phân quyền." };
  }
  if (role === "admin") {
    return { ok: false, error: "Quản trị viên luôn có toàn quyền, không thể đổi." };
  }
  if (
    !RESOURCES.includes(resource) ||
    !ROLES.includes(role) ||
    !SCOPES.includes(input.edit_scope)
  ) {
    return { ok: false, error: "Giá trị phân quyền không hợp lệ." };
  }

  try {
    await updateRolePermission(resource, role, input);
  } catch {
    return { ok: false, error: "Không cập nhật được phân quyền." };
  }

  // Cấu hình đổi -> làm mới các trang phụ thuộc quyền.
  revalidatePath("/cai-dat");
  revalidatePath("/cong-viec");
  revalidatePath("/du-an", "layout");
  return { ok: true };
}
