// Kiểm tra quyền sửa/xóa ở tầng server action — phản ánh đúng RLS (migration
// 0014) để trả về thông báo rõ ràng thay vì lỗi/không-làm-gì âm thầm.
//   - admin, manager: sửa được mọi dự án/công việc vận hành.
//   - staff: chỉ sửa dự án mình sở hữu (owner_id) và công việc mình tạo (created_by).
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "./profiles";

/** Vai trò quản lý trở lên (được ghi mọi dữ liệu vận hành). */
export async function canManageAll(): Promise<boolean> {
  const me = await getCurrentProfile();
  return !!me && (me.role === "admin" || me.role === "manager");
}

/** Có quyền sửa/xóa một công việc cụ thể không. */
export async function canWriteTask(taskId: string): Promise<boolean> {
  const me = await getCurrentProfile();
  if (!me) return false;
  if (me.role === "admin" || me.role === "manager") return true;

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
  if (me.role === "admin" || me.role === "manager") return true;

  const supabase = createClient();
  const { data } = await supabase
    .from("projects")
    .select("owner_id")
    .eq("id", projectId)
    .single();
  return (data as { owner_id: string | null } | null)?.owner_id === me.id;
}
