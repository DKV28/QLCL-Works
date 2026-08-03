// Data access: tasks (kèm join task_assignees -> members).
// Chỉ chứa query Supabase, không JSX.
import { createClient } from "@/lib/supabase/server";
import { listTeams, teamDisplayName } from "./teams";
import { setTaskTags } from "./tags";
import { todayISO } from "@/lib/logic/overdue";
import type {
  Attachment,
  MemberLite,
  Subtask,
  Tag,
  Task,
  TaskPriority,
  TaskRepeat,
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
  subtasks: Subtask[] | null;
  attachments: Attachment[] | null;
  task_tags: { tags: Pick<Tag, "id" | "name" | "color"> | null }[] | null;
}

const SELECT_WITH_ASSIGNEES = `
  *,
  task_assignees (
    is_primary,
    members ( id, full_name, team_id )
  ),
  subtasks ( id, task_id, title, is_done, sort_order, created_at, updated_at ),
  attachments ( id, task_id, file_name, storage_path, mime_type, size_bytes, created_at ),
  task_tags ( tags ( id, name, color ) )
`;

function mapRow(row: TaskRow, teams: Team[]): TaskWithAssignees {
  const { task_assignees, subtasks, attachments, task_tags, ...task } = row;

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

  const sortedSubtasks = [...(subtasks ?? [])].sort(
    (a, b) => a.sort_order - b.sort_order,
  );

  const sortedAttachments = [...(attachments ?? [])].sort((a, b) =>
    a.created_at.localeCompare(b.created_at),
  );

  const tags = (task_tags ?? [])
    .map((tt) => tt.tags)
    .filter((t): t is NonNullable<typeof t> => t !== null);

  return {
    ...(task as Task),
    primary,
    supporters,
    subtasks: sortedSubtasks,
    attachments: sortedAttachments,
    tags,
  };
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

/** Toàn bộ công việc vận hành (loại công việc thuộc dự án mẫu). */
export async function listAllTasks(): Promise<TaskWithAssignees[]> {
  const supabase = createClient();

  // Lấy id dự án mẫu để loại công việc của chúng khỏi màn hình vận hành.
  const { data: tpl } = await supabase
    .from("projects")
    .select("id")
    .eq("is_template", true)
    .is("deleted_at", null);
  const templateIds = new Set(
    ((tpl as { id: string }[]) ?? []).map((r) => r.id),
  );

  const [teams, res] = await Promise.all([
    listTeams(),
    supabase
      .from("tasks")
      .select(SELECT_WITH_ASSIGNEES)
      .is("deleted_at", null)
      .order("due_date", { ascending: true, nullsFirst: false }),
  ]);

  if (res.error) throw res.error;
  // Lọc ở JS để KHÔNG loại nhầm công việc không thuộc dự án (project_id = null).
  return ((res.data as unknown as TaskRow[]) ?? [])
    .filter((r) => !r.project_id || !templateIds.has(r.project_id))
    .map((r) => mapRow(r, teams));
}

export interface TaskInput {
  project_id: string | null; // dự án là tùy chọn
  title: string;
  description?: string | null;
  start_date?: string | null;
  due_date?: string | null;
  priority?: TaskPriority;
  status?: TaskStatus;
  repeat?: TaskRepeat;
  is_arising?: boolean; // công việc phát sinh (ngoài kế hoạch)
  van_hanh_step?: string | null; // bước quy trình vận hành (null = công việc thường)
  primary_member_id?: string | null; // người phụ trách chính (bắt buộc khi tạo)
  support_member_ids?: string[]; // người hỗ trợ (tùy chọn)
  tag_ids?: string[]; // nhãn (tùy chọn)
}

export async function createTask(input: TaskInput): Promise<Task> {
  const supabase = createClient();
  const { primary_member_id, support_member_ids, tag_ids, ...taskFields } =
    input;

  const { data, error } = await supabase
    .from("tasks")
    .insert(taskFields)
    .select("*")
    .single();
  if (error) throw error;

  const task = data as Task;
  await Promise.all([
    setAssignees(task.id, primary_member_id ?? null, support_member_ids ?? []),
    setTaskTags(task.id, tag_ids ?? []),
  ]);
  return task;
}

export async function updateTask(
  id: string,
  input: Partial<TaskInput>,
): Promise<Task> {
  const supabase = createClient();
  const { primary_member_id, support_member_ids, tag_ids, ...taskFields } =
    input;

  const { data, error } = await supabase
    .from("tasks")
    .update(taskFields)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;

  // Chỉ cập nhật người phụ trách khi form có gửi lên.
  const relatedUpdates: Promise<void>[] = [];
  if (primary_member_id !== undefined || support_member_ids !== undefined) {
    relatedUpdates.push(
      setAssignees(id, primary_member_id ?? null, support_member_ids ?? []),
    );
  }
  if (tag_ids !== undefined) relatedUpdates.push(setTaskTags(id, tag_ids));
  await Promise.all(relatedUpdates);
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

function shiftISODate(iso: string, repeat: TaskRepeat): string {
  const d = new Date(iso + "T00:00:00Z");
  if (repeat === "daily") d.setUTCDate(d.getUTCDate() + 1);
  else if (repeat === "weekly") d.setUTCDate(d.getUTCDate() + 7);
  else if (repeat === "monthly") d.setUTCMonth(d.getUTCMonth() + 1);
  return d.toISOString().slice(0, 10);
}

interface RecurSrc extends Task {
  task_assignees: { member_id: string; is_primary: boolean }[] | null;
  subtasks: { title: string; sort_order: number }[] | null;
  task_tags: { tag_id: string }[] | null;
}

/**
 * Khi hoàn thành một công việc có lặp lại (giống Microsoft To Do): tự tạo
 * lần kế tiếp với mốc ngày dời theo chu kỳ, giữ người phụ trách/nhãn/nhiệm vụ con.
 */
export async function createNextRecurrence(taskId: string): Promise<void> {
  const supabase = createClient();
  const { data } = await supabase
    .from("tasks")
    .select(
      "*, task_assignees ( member_id, is_primary ), subtasks ( title, sort_order ), task_tags ( tag_id )",
    )
    .eq("id", taskId)
    .single();
  if (!data) return;
  const src = data as unknown as RecurSrc;
  if (!src.repeat || src.repeat === "none") return;

  const anchor = src.due_date ?? src.start_date ?? todayISO();
  const nextDue = shiftISODate(anchor, src.repeat);
  const nextStart = src.start_date
    ? shiftISODate(src.start_date, src.repeat)
    : null;

  const { data: created, error } = await supabase
    .from("tasks")
    .insert({
      project_id: src.project_id,
      title: src.title,
      description: src.description,
      start_date: nextStart,
      due_date: src.due_date ? nextDue : null,
      priority: src.priority,
      status: "chua_bat_dau",
      repeat: src.repeat,
      is_arising: src.is_arising,
      completed_at: null,
    })
    .select("id")
    .single();
  if (error || !created) return;
  const newId = (created as { id: string }).id;

  const assignees = (src.task_assignees ?? []).map((a) => ({
    task_id: newId,
    member_id: a.member_id,
    is_primary: a.is_primary,
  }));
  if (assignees.length) await supabase.from("task_assignees").insert(assignees);

  const subs = (src.subtasks ?? []).map((st) => ({
    task_id: newId,
    title: st.title,
    sort_order: st.sort_order,
    is_done: false,
  }));
  if (subs.length) await supabase.from("subtasks").insert(subs);

  const tagRows = (src.task_tags ?? []).map((tt) => ({
    task_id: newId,
    tag_id: tt.tag_id,
  }));
  if (tagRows.length) await supabase.from("task_tags").insert(tagRows);
}

/** Lấy thông tin tối thiểu để chuyển bước quy trình vận hành. */
export async function getTaskStepInfo(
  id: string,
): Promise<{ van_hanh_step: string | null; project_id: string | null } | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("tasks")
    .select("van_hanh_step, project_id")
    .eq("id", id)
    .single();
  return (
    (data as { van_hanh_step: string | null; project_id: string | null } | null) ??
    null
  );
}

/** Cập nhật bước + deadline (+ hoàn thành nếu là bước cuối) khi chuyển bước. */
export async function updateTaskStep(
  id: string,
  patch: {
    van_hanh_step: string;
    due_date?: string | null;
    status?: TaskStatus;
    completed?: boolean;
  },
): Promise<void> {
  const supabase = createClient();
  const fields: Record<string, unknown> = { van_hanh_step: patch.van_hanh_step };
  if (patch.due_date !== undefined) fields.due_date = patch.due_date;
  if (patch.status !== undefined) fields.status = patch.status;
  if (patch.completed !== undefined) {
    fields.completed_at = patch.completed ? new Date().toISOString() : null;
  }
  const { error } = await supabase.from("tasks").update(fields).eq("id", id);
  if (error) throw error;
}

export async function getTaskTitle(id: string): Promise<string | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("tasks")
    .select("title")
    .eq("id", id)
    .single();
  return (data as { title: string } | null)?.title ?? null;
}

/** Công việc đã hoàn thành chưa (để tránh sinh việc lặp trùng). */
export async function isTaskCompleted(id: string): Promise<boolean> {
  const supabase = createClient();
  const { data } = await supabase
    .from("tasks")
    .select("completed_at, status")
    .eq("id", id)
    .single();
  const row = data as { completed_at: string | null; status: string } | null;
  return !!row && (!!row.completed_at || row.status === "hoan_thanh");
}

/** Đặt trạng thái + đồng bộ completed_at (dùng cho kéo thả Kanban). */
export async function setStatus(
  id: string,
  status: TaskStatus,
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("tasks")
    .update({
      status,
      completed_at:
        status === "hoan_thanh" ? new Date().toISOString() : null,
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

interface DuplicateSrc extends Task {
  task_assignees: { member_id: string; is_primary: boolean }[] | null;
  subtasks: { title: string; sort_order: number }[] | null;
  task_tags: { tag_id: string }[] | null;
}

/**
 * Nhân bản công việc: sao chép trường + người phụ trách + nhiệm vụ con
 * (KHÔNG sao chép tệp đính kèm). Trạng thái đặt lại "chưa bắt đầu".
 * targetProjectId: nếu truyền (nhân bản dự án) thì đưa vào dự án mới và
 * giữ nguyên tên; nếu không thì thêm hậu tố "(bản sao)".
 */
export async function duplicateTask(
  taskId: string,
  targetProjectId?: string,
): Promise<Task> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("tasks")
    .select(
      "*, task_assignees ( member_id, is_primary ), subtasks ( title, sort_order ), task_tags ( tag_id )",
    )
    .eq("id", taskId)
    .single();
  if (error) throw error;
  const src = data as unknown as DuplicateSrc;

  const { data: created, error: e2 } = await supabase
    .from("tasks")
    .insert({
      project_id: targetProjectId ?? src.project_id,
      title: targetProjectId ? src.title : `${src.title} (bản sao)`,
      description: src.description,
      start_date: src.start_date,
      due_date: src.due_date,
      priority: src.priority,
      status: "chua_bat_dau",
      is_arising: src.is_arising,
      completed_at: null,
    })
    .select("*")
    .single();
  if (e2) throw e2;
  const newTask = created as Task;

  const assignees = (src.task_assignees ?? []).map((a) => ({
    task_id: newTask.id,
    member_id: a.member_id,
    is_primary: a.is_primary,
  }));
  if (assignees.length) await supabase.from("task_assignees").insert(assignees);

  const subs = (src.subtasks ?? []).map((st) => ({
    task_id: newTask.id,
    title: st.title,
    sort_order: st.sort_order,
    is_done: false,
  }));
  if (subs.length) await supabase.from("subtasks").insert(subs);

  const tagRows = (src.task_tags ?? []).map((tt) => ({
    task_id: newTask.id,
    tag_id: tt.tag_id,
  }));
  if (tagRows.length) await supabase.from("task_tags").insert(tagRows);

  return newTask;
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
