// Đọc phân quyền cấu hình được (bảng role_permissions) và kiểm tra quyền
// sửa/xóa ở tầng server action — phản ánh đúng RLS (migration 0017) để trả
// về thông báo rõ ràng thay vì lỗi/không-làm-gì âm thầm.
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "./profiles";
import type {
  EditScope,
  PermissionResource,
  Role,
  RolePermission,
} from "@/lib/types";

/** Toàn bộ cấu hình phân quyền (để hiển thị/chỉnh trong Cài đặt). */
export async function listRolePermissions(): Promise<RolePermission[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("role_permissions").select("*");
  if (error) throw error;
  return (data as RolePermission[]) ?? [];
}

/** Cập nhật một ô cấu hình (admin). RLS yêu cầu is_admin(). */
export async function updateRolePermission(
  resource: PermissionResource,
  role: Role,
  input: { edit_scope: EditScope; can_create: boolean },
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("role_permissions")
    .update({ edit_scope: input.edit_scope, can_create: input.can_create })
    .eq("resource", resource)
    .eq("role", role);
  if (error) throw error;
}

/** Phạm vi sửa của người dùng hiện tại cho một loại đối tượng. */
async function editScope(
  role: Role,
  resource: PermissionResource,
): Promise<EditScope> {
  const supabase = createClient();
  const { data } = await supabase
    .from("role_permissions")
    .select("edit_scope")
    .eq("resource", resource)
    .eq("role", role)
    .single();
  return (data as { edit_scope: EditScope } | null)?.edit_scope ?? "none";
}

/** Có quyền sửa/xóa một công việc cụ thể không. */
export async function canWriteTask(taskId: string): Promise<boolean> {
  const me = await getCurrentProfile();
  if (!me) return false;
  const scope = await editScope(me.role, "task");
  if (scope === "all") return true;
  if (scope === "none") return false;

  const supabase = createClient();
  const { data } = await supabase
    .from("tasks")
    .select("created_by")
    .eq("id", taskId)
    .single();
  return (data as { created_by: string | null } | null)?.created_by === me.id;
}

/** Có quyền sửa/xóa một dự án cụ thể không. */
export async function canWriteProject(projectId: string): Promise<boolean> {
  const me = await getCurrentProfile();
  if (!me) return false;
  const scope = await editScope(me.role, "project");
  if (scope === "all") return true;
  if (scope === "none") return false;

  const supabase = createClient();
  const { data } = await supabase
    .from("projects")
    .select("owner_id")
    .eq("id", projectId)
    .single();
  return (data as { owner_id: string | null } | null)?.owner_id === me.id;
}
