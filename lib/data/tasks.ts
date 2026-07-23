// Data access: tasks (kèm join task_assignees -> members).
// Chỉ chứa query Supabase, không JSX.
import { createClient } from "@/lib/supabase/server";
import { listTeams, teamDisplayName } from "./teams";
import type {
  MemberLite,
  Task,
  TaskPriority,
  TaskStatus,
  Team,
  TaskWithAssignees,
} from "@/lib/types";

// Hàng trả về từ Supabase khi join lồng
interface TaskRow extends Task {
  task_assignees:
    | {
        is_primary: boolean;
        members: {
          id: string;
          full_name: string;
          team_id: string | null;
        } | null;
      }[]
    | null;
}

const SELECT_WITH_ASSIGNEES = `
  *,
  task_assignees (
    is_primary,
    members ( id, full_name, team_id )
  )
`;

function mapRow(row: TaskRow, teams: Team[]): TaskWithAssignees {
  const { task_assignees, ...task } = row;

  let primary: MemberLite | null = null;
  const supporters: MemberLite[] = [];

  for (const ta of task_assignees ?? []) {
    if (!ta.members) continue;
    const lite: MemberLite = {
      id: ta.members.id,
      full_name: ta.members.full_name,
      team_id: ta.members.team_id,
      team_name: teamDisplayName(ta.members.team_id, teams),
    };
    if (ta.is_primary) primary = lite;
    else supporters.push(lite);
  }

  supporters.sort((a, b) => a.full_name.localeCompare(b.full_name, "vi"));
  return { ...(task as Task), primary, supporters };
}

/** Danh sách công việc của 1 dự án. */
export async function listTasksByProject(
  projectId: string,
): Promise<TaskWithAssignees[]> {
  const supabase = createClient();
  const [teams, res] = await Promise.all([
    listTeams(),
    supabase
      .from("tasks")
      .select(SELECT_WITH_ASSIGNEES)
      .eq("project_id", projectId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
  ]);

  if (res.error) throw res.error;
  return ((res.data as unknown as TaskRow[]) ?? []).map((r) => mapRow(r, teams));
}

/** Toàn bộ công việc (view Danh sách tổng, có lọc phía client). */
export async function listAllTasks(): Promise<TaskWithAssignees[]> {
  const supabase = createClient();
  const [teams, res] = await Promise.all([
    listTeams(),
    supabase
      .from("tasks")
      .select(SELECT_WITH_ASSIGNEES)
      .is("deleted_at", null)
      .order("due_date", { ascending: true, nullsFirst: false }),
  ]);

  if (res.error) throw res.error;
  return ((res.data as unknown as TaskRow[]) ?? []).map((r) => mapRow(r, teams));
}

export interface TaskInput {
  project_id: string;
  title: string;
  description?: string | null;
  start_date?: string | null;
  due_date?: string | null;
  priority?: TaskPriority;
  status?: TaskStatus;
  primary_member_id?: string | null; // người phụ trách chính (bắt buộc khi tạo)
  support_member_ids?: string[]; // người hỗ trợ (tùy chọn)
}

export async function createTask(input: TaskInput): Promise<Task> {
  const supabase = createClient();
  const { primary_member_id, support_member_ids, ...taskFields } = input;

  const { data, error } = await supabase
    .from("tasks")
    .insert(taskFields)
    .select("*")
    .single();
  if (error) throw error;

  const task = data as Task;
  await setAssignees(task.id, primary_member_id ?? null, support_member_ids ?? []);
  return task;
}

export async function updateTask(
  id: string,
  input: Partial<TaskInput>,
): Promise<Task> {
  const supabase = createClient();
  const { primary_member_id, support_member_ids, ...taskFields } = input;

  const { data, error } = await supabase
    .from("tasks")
    .update(taskFields)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;

  // Chỉ cập nhật người phụ trách khi form có gửi lên.
  if (primary_member_id !== undefined || support_member_ids !== undefined) {
    await setAssignees(id, primary_member_id ?? null, support_member_ids ?? []);
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
 * Gán người phụ trách: xóa hết bản ghi cũ rồi thêm mới —
 * 1 dòng phụ trách chính (is_primary) + N dòng hỗ trợ (loại trùng primary).
 */
async function setAssignees(
  taskId: string,
  primaryId: string | null,
  supportIds: string[],
): Promise<void> {
  const supabase = createClient();
  await supabase.from("task_assignees").delete().eq("task_id", taskId);

  const rows: { task_id: string; member_id: string; is_primary: boolean }[] = [];
  if (primaryId) {
    rows.push({ task_id: taskId, member_id: primaryId, is_primary: true });
  }
  for (const sid of supportIds) {
    if (sid && sid !== primaryId) {
      rows.push({ task_id: taskId, member_id: sid, is_primary: false });
    }
  }

  if (rows.length > 0) {
    const { error } = await supabase.from("task_assignees").insert(rows);
    if (error) throw error;
  }
}
