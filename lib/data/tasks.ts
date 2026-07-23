// Data access: tasks (kèm join task_assignees -> profiles).
// Chỉ chứa query Supabase, không JSX.
import { createClient } from "@/lib/supabase/server";
import type {
  Task,
  TaskPriority,
  TaskStatus,
  TaskWithAssignees,
} from "@/lib/types";

// Hàng trả về từ Supabase khi join lồng
interface TaskRow extends Task {
  task_assignees:
    | {
        profiles: { id: string; full_name: string | null; email: string | null } | null;
      }[]
    | null;
}

const SELECT_WITH_ASSIGNEES = `
  *,
  task_assignees (
    profiles ( id, full_name, email )
  )
`;

function mapRow(row: TaskRow): TaskWithAssignees {
  const { task_assignees, ...task } = row;
  const assignees = (task_assignees ?? [])
    .map((ta) => ta.profiles)
    .filter((p): p is NonNullable<typeof p> => p !== null);
  return { ...(task as Task), assignees };
}

/** Danh sách công việc của 1 dự án. */
export async function listTasksByProject(
  projectId: string,
): Promise<TaskWithAssignees[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("tasks")
    .select(SELECT_WITH_ASSIGNEES)
    .eq("project_id", projectId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return ((data as unknown as TaskRow[]) ?? []).map(mapRow);
}

/** Toàn bộ công việc (view Danh sách tổng, có lọc phía client). */
export async function listAllTasks(): Promise<TaskWithAssignees[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("tasks")
    .select(SELECT_WITH_ASSIGNEES)
    .is("deleted_at", null)
    .order("due_date", { ascending: true, nullsFirst: false });

  if (error) throw error;
  return ((data as unknown as TaskRow[]) ?? []).map(mapRow);
}

export interface TaskInput {
  project_id: string;
  title: string;
  description?: string | null;
  start_date?: string | null;
  due_date?: string | null;
  priority?: TaskPriority;
  status?: TaskStatus;
  assignee_id?: string | null; // V1: 1 người phụ trách
}

export async function createTask(input: TaskInput): Promise<Task> {
  const supabase = createClient();
  const { assignee_id, ...taskFields } = input;

  const { data, error } = await supabase
    .from("tasks")
    .insert(taskFields)
    .select("*")
    .single();
  if (error) throw error;

  const task = data as Task;
  await setAssignee(task.id, assignee_id ?? null);
  return task;
}

export async function updateTask(
  id: string,
  input: Partial<TaskInput>,
): Promise<Task> {
  const supabase = createClient();
  const { assignee_id, ...taskFields } = input;

  const { data, error } = await supabase
    .from("tasks")
    .update(taskFields)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;

  if (assignee_id !== undefined) {
    await setAssignee(id, assignee_id);
  }
  return data as Task;
}

/** Bật/tắt hoàn thành nhanh: set/clear completed_at + đồng bộ status. */
export async function toggleComplete(
  id: string,
  completed: boolean,
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("tasks")
    .update({
      completed_at: completed ? new Date().toISOString() : null,
      status: completed ? "hoan_thanh" : "dang_lam",
    })
    .eq("id", id);
  if (error) throw error;
}

export async function softDeleteTask(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("tasks")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

/**
 * V1: mỗi công việc 1 người phụ trách. Xóa hết bản ghi cũ rồi thêm mới.
 * Cấu trúc này giữ nguyên khi V2 cho phép nhiều người (chỉ bỏ giới hạn UI).
 */
async function setAssignee(taskId: string, userId: string | null): Promise<void> {
  const supabase = createClient();
  await supabase.from("task_assignees").delete().eq("task_id", taskId);
  if (userId) {
    const { error } = await supabase
      .from("task_assignees")
      .insert({ task_id: taskId, user_id: userId });
    if (error) throw error;
  }
}
