// Data access: tasks (kèm join task_assignees -> members).
// Chỉ chứa query Supabase, không JSX.
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { listTeams, teamDisplayName } from "./teams";
import { setTaskTags } from "./tags";
import { todayISO, toVNDate } from "@/lib/logic/overdue";
import { addWorkingDays } from "@/lib/logic/working-days";
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

// Hàng trả về từ Supabase khi join lồng. Subtasks chỉ lấy is_done (đủ tính
// done/total cho badge), attachments chỉ lấy count — dữ liệu đầy đủ tải riêng
// khi mở chi tiết công việc.
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
  subtasks: { is_done: boolean }[] | null;
  attachments: { count: number }[] | null;
  task_tags: { tags: Pick<Tag, "id" | "name" | "color"> | null }[] | null;
}

const SELECT_WITH_ASSIGNEES = `
  *,
  task_assignees (
    is_primary,
    members ( id, full_name, team_id )
  ),
  subtasks!subtasks_task_id_fkey ( is_done ),
  attachments ( count ),
  task_tags ( tags ( id, name, color ) )
`;

function mapRow(
  row: TaskRow,
  teams: Team[],
  parentTitles?: Map<string, string>,
): TaskWithAssignees {
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

  const subtaskTotal = subtasks?.length ?? 0;
  const subtaskDone = (subtasks ?? []).filter((s) => s.is_done).length;
  const attachmentCount = attachments?.[0]?.count ?? 0;

  const tags = (task_tags ?? [])
    .map((tt) => tt.tags)
    .filter((t): t is NonNullable<typeof t> => t !== null);

  return {
    ...(task as Task),
    primary,
    supporters,
    subtaskTotal,
    subtaskDone,
    attachmentCount,
    tags,
    parentTitle: task.parent_task_id
      ? parentTitles?.get(task.parent_task_id) ?? null
      : null,
  };
}

/**
 * Lấy tiêu đề các bài gốc cho những task có parent_task_id — resolve trong JS
 * thay vì embed self-reference (PostgREST hiểu nhầm hướng quan hệ tự tham chiếu).
 */
async function fetchParentTitles(
  rows: { parent_task_id: string | null }[],
): Promise<Map<string, string>> {
  const ids = Array.from(
    new Set(
      rows
        .map((r) => r.parent_task_id)
        .filter((v): v is string => typeof v === "string"),
    ),
  );
  const map = new Map<string, string>();
  if (ids.length === 0) return map;
  const supabase = createClient();
  const { data } = await supabase
    .from("tasks")
    .select("id, title")
    .in("id", ids);
  for (const t of (data as { id: string; title: string }[]) ?? []) {
    map.set(t.id, t.title);
  }
  return map;
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
  const rows = (res.data as unknown as TaskRow[]) ?? [];
  const parentTitles = await fetchParentTitles(rows);
  return rows.map((r) => mapRow(r, teams, parentTitles));
}

/** Toàn bộ công việc vận hành (loại công việc thuộc dự án mẫu). */
export async function listAllTasks(): Promise<TaskWithAssignees[]> {
  const supabase = createClient();

  // Chạy song song: id dự án mẫu (để loại việc của chúng), teams, và danh sách task.
  const [tplRes, teams, res] = await Promise.all([
    supabase
      .from("projects")
      .select("id")
      .eq("is_template", true)
      .is("deleted_at", null),
    listTeams(),
    supabase
      .from("tasks")
      .select(SELECT_WITH_ASSIGNEES)
      .is("deleted_at", null)
      .order("due_date", { ascending: true, nullsFirst: false }),
  ]);

  const templateIds = new Set(
    ((tplRes.data as { id: string }[]) ?? []).map((r) => r.id),
  );

  if (res.error) throw res.error;
  // Lọc ở JS để KHÔNG loại nhầm công việc không thuộc dự án (project_id = null).
  const rows = ((res.data as unknown as TaskRow[]) ?? []).filter(
    (r) => !r.project_id || !templateIds.has(r.project_id),
  );
  const parentTitles = await fetchParentTitles(rows);
  return rows.map((r) => mapRow(r, teams, parentTitles));
}

export interface TaskInput {
  project_id: string | null; // dự án là tùy chọn
  parent_task_id?: string | null; // bài gốc (nếu là việc theo dõi/đề xuất)
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

export interface BulkTaskLine {
  title: string;
  due_date?: string | null; // deadline riêng của dòng (nếu có)
}

export interface BulkTaskInput {
  project_id: string | null;
  primary_member_id: string | null;
  support_member_ids?: string[];
  tag_ids?: string[];
  due_date?: string | null; // deadline chung, dùng cho dòng không ghi riêng
  lines: BulkTaskLine[];
}

/**
 * Tạo nhiều công việc trong một lượt (nhập hàng loạt).
 * Chèn hàng loạt tasks trước, rồi gán người phụ trách và nhãn theo lô —
 * hiệu quả hơn gọi createTask từng dòng. Trả về số công việc đã tạo.
 */
export async function createTasksBulk(input: BulkTaskInput): Promise<number> {
  const supabase = createClient();

  const rows = input.lines
    .filter((line) => line.title.trim())
    .map((line) => ({
      project_id: input.project_id,
      title: line.title.trim(),
      due_date: line.due_date ?? input.due_date ?? null,
    }));
  if (rows.length === 0) return 0;

  const { data, error } = await supabase.from("tasks").insert(rows).select("id");
  if (error) throw error;
  const ids = (data as { id: string }[]).map((r) => r.id);

  const primary = input.primary_member_id ?? null;
  const supportIds = (input.support_member_ids ?? []).filter(
    (sid) => sid && sid !== primary,
  );
  const assigneeRows: {
    task_id: string;
    member_id: string;
    is_primary: boolean;
  }[] = [];
  for (const id of ids) {
    if (primary) {
      assigneeRows.push({ task_id: id, member_id: primary, is_primary: true });
    }
    for (const sid of supportIds) {
      assigneeRows.push({ task_id: id, member_id: sid, is_primary: false });
    }
  }
  if (assigneeRows.length > 0) {
    const { error: aErr } = await supabase
      .from("task_assignees")
      .insert(assigneeRows);
    if (aErr) throw aErr;
  }

  const tagIds = (input.tag_ids ?? []).filter(Boolean);
  if (tagIds.length > 0) {
    const tagRows = ids.flatMap((id) =>
      tagIds.map((tagId) => ({ task_id: id, tag_id: tagId })),
    );
    const { error: tErr } = await supabase.from("task_tags").insert(tagRows);
    if (tErr) throw tErr;
  }

  return ids.length;
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

/** Chỉ đặt/xóa mốc completed_at (dùng khi hoàn thành qua form sửa trạng thái). */
export async function setTaskCompletedAt(
  id: string,
  completedAt: string | null,
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("tasks")
    .update({ completed_at: completedAt })
    .eq("id", id);
  if (error) throw error;
}

/**
 * Đồng bộ hoàn thành NGƯỢC về nhiệm vụ con nguồn: khi hoàn thành/mở lại một
 * việc theo dõi (đề xuất), đánh dấu nhiệm vụ con đã sinh ra nó tương ứng — để
 * tiến độ nhiệm vụ con phản ánh đúng khi đề xuất đã xong. Best-effort: lỗi chỉ
 * ghi log, không chặn thao tác chính.
 */
async function syncSourceSubtaskDone(
  childTaskId: string,
  done: boolean,
): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("subtasks")
    .update({ is_done: done })
    .eq("followup_task_id", childTaskId);
  if (error) console.error("syncSourceSubtaskDone", error);
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
  await syncSourceSubtaskDone(id, completed);
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
  subtasks:
    | { title: string; sort_order: number; followup_offset_days: number | null }[]
    | null;
  task_tags: { tag_id: string }[] | null;
}

/**
 * Khi hoàn thành một công việc có lặp lại (giống Microsoft To Do): tự tạo
 * lần kế tiếp với mốc ngày dời theo chu kỳ, giữ người phụ trách/nhãn/nhiệm vụ con.
 */
export async function createNextRecurrence(taskId: string): Promise<void> {
  // Dùng admin client cho toàn bộ thao tác sinh việc lặp: đây là hành động do
  // HỆ THỐNG thực hiện, không nên bị RLS/can_create của người hoàn thành chặn
  // (nguyên nhân "đôi lúc không tạo được việc mới"). Giữ created_by theo bản gốc.
  const supabase = createAdminClient();
  const { data, error: readErr } = await supabase
    .from("tasks")
    .select(
      "*, task_assignees ( member_id, is_primary ), subtasks!subtasks_task_id_fkey ( title, sort_order, followup_offset_days ), task_tags ( tag_id )",
    )
    .eq("id", taskId)
    .single();
  if (readErr) {
    console.error("createNextRecurrence: không đọc được việc gốc", readErr);
    return;
  }
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
      created_by: src.created_by,
    })
    .select("id")
    .single();
  if (error || !created) {
    // KHÔNG nuốt lỗi: ghi log để chẩn đoán thay vì âm thầm bỏ qua việc lặp.
    console.error("createNextRecurrence: không tạo được việc kế tiếp", error);
    return;
  }
  const newId = (created as { id: string }).id;

  const assignees = (src.task_assignees ?? []).map((a) => ({
    task_id: newId,
    member_id: a.member_id,
    is_primary: a.is_primary,
  }));
  if (assignees.length) {
    const { error: aErr } = await supabase
      .from("task_assignees")
      .insert(assignees);
    if (aErr) console.error("createNextRecurrence: lỗi gán người phụ trách", aErr);
  }

  const subs = (src.subtasks ?? []).map((st) => ({
    task_id: newId,
    title: st.title,
    sort_order: st.sort_order,
    is_done: false,
    // Giữ số ngày hạn để lần lặp sau vẫn tự sinh đề xuất; followup_task_id để
    // mặc định null (chưa sinh) cho lần lặp mới.
    followup_offset_days: st.followup_offset_days ?? null,
  }));
  if (subs.length) {
    const { error: sErr } = await supabase.from("subtasks").insert(subs);
    if (sErr) console.error("createNextRecurrence: lỗi tạo nhiệm vụ con", sErr);
  }

  const tagRows = (src.task_tags ?? []).map((tt) => ({
    task_id: newId,
    tag_id: tt.tag_id,
  }));
  if (tagRows.length) {
    const { error: tErr } = await supabase.from("task_tags").insert(tagRows);
    if (tErr) console.error("createNextRecurrence: lỗi gắn nhãn", tErr);
  }
}

// --- Việc theo dõi / đề xuất sinh từ công việc ---------------------------

/** Mốc tính hạn: ngày (giờ VN) của completed_at, fallback hôm nay. */
function toISODate(value: string | null | undefined): string {
  if (!value) return todayISO();
  return toVNDate(value);
}

/**
 * Chèn một việc theo dõi (đề xuất) là con của `parentTaskId`, dùng admin client.
 * Trả về id việc con vừa tạo (hoặc null nếu lỗi).
 */
async function insertFollowupChild(
  supabase: ReturnType<typeof createAdminClient>,
  input: {
    parentTaskId: string;
    projectId: string | null;
    title: string;
    dueDate: string | null;
    primaryMemberId: string | null;
    supportMemberIds?: string[];
    createdBy: string | null;
  },
): Promise<string | null> {
  const { data: created, error } = await supabase
    .from("tasks")
    .insert({
      project_id: input.projectId,
      parent_task_id: input.parentTaskId,
      title: input.title,
      due_date: input.dueDate,
      status: "chua_bat_dau",
      created_by: input.createdBy,
    })
    .select("id")
    .single();
  if (error || !created) {
    console.error("insertFollowupChild: không tạo được việc theo dõi", error);
    return null;
  }
  const childId = (created as { id: string }).id;

  const primary = input.primaryMemberId ?? null;
  const supportIds = (input.supportMemberIds ?? []).filter(
    (sid) => sid && sid !== primary,
  );
  const assigneeRows: { task_id: string; member_id: string; is_primary: boolean }[] =
    [];
  if (primary)
    assigneeRows.push({ task_id: childId, member_id: primary, is_primary: true });
  for (const sid of supportIds)
    assigneeRows.push({ task_id: childId, member_id: sid, is_primary: false });
  if (assigneeRows.length) {
    const { error: aErr } = await supabase
      .from("task_assignees")
      .insert(assigneeRows);
    if (aErr) console.error("insertFollowupChild: lỗi gán người phụ trách", aErr);
  }
  return childId;
}

interface FollowupSrc {
  project_id: string | null;
  completed_at: string | null;
  created_by: string | null;
  task_assignees: { member_id: string; is_primary: boolean }[] | null;
  subtasks:
    | {
        id: string;
        title: string;
        followup_offset_days: number | null;
        followup_task_id: string | null;
      }[]
    | null;
}

/**
 * TỰ ĐỘNG sinh việc theo dõi khi hoàn thành công việc: với mỗi nhiệm vụ con có
 * `followup_offset_days` và CHƯA sinh (`followup_task_id` null), tạo một công
 * việc con hạn = ngày hoàn thành + N ngày làm việc (trừ CN), kế thừa dự án +
 * người phụ trách chính của bài gốc. Dùng admin client (thao tác hệ thống).
 */
export async function createFollowupTasks(taskId: string): Promise<void> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("tasks")
    .select(
      "project_id, completed_at, created_by, task_assignees ( member_id, is_primary ), subtasks!subtasks_task_id_fkey ( id, title, followup_offset_days, followup_task_id )",
    )
    .eq("id", taskId)
    .single();
  if (error || !data) {
    if (error) console.error("createFollowupTasks: không đọc được việc gốc", error);
    return;
  }
  const src = data as unknown as FollowupSrc;

  const pending = (src.subtasks ?? []).filter(
    (s) =>
      s.followup_offset_days != null &&
      s.followup_offset_days > 0 &&
      !s.followup_task_id,
  );
  if (pending.length === 0) return;

  const base = toISODate(src.completed_at);
  const primaryMemberId =
    (src.task_assignees ?? []).find((a) => a.is_primary)?.member_id ?? null;

  for (const st of pending) {
    const childId = await insertFollowupChild(supabase, {
      parentTaskId: taskId,
      projectId: src.project_id,
      title: st.title,
      dueDate: addWorkingDays(st.followup_offset_days as number, base),
      primaryMemberId,
      createdBy: src.created_by,
    });
    if (childId) {
      const { error: uErr } = await supabase
        .from("subtasks")
        .update({ followup_task_id: childId })
        .eq("id", st.id);
      if (uErr)
        console.error("createFollowupTasks: lỗi đánh dấu subtask", uErr);
    }
  }
}

export interface FollowupManualInput {
  parentTaskId: string;
  baseDateISO: string; // YYYY-MM-DD, mốc tính hạn
  primaryMemberId: string | null;
  supportMemberIds?: string[];
  items: {
    subtaskId: string | null; // null = dòng đề xuất tự do
    title: string;
    offsetDays: number;
  }[];
}

/**
 * THỦ CÔNG (từ hộp thoại "Tạo đề xuất theo dõi"): tạo việc theo dõi cho từng
 * item. Item gắn subtask thì đánh dấu `followup_task_id` để không sinh trùng.
 * Trả về số việc con đã tạo.
 */
export async function createFollowupsManual(
  input: FollowupManualInput,
): Promise<number> {
  const supabase = createAdminClient();

  // Kế thừa dự án + người tạo từ bài gốc.
  const { data: parent } = await supabase
    .from("tasks")
    .select("project_id, created_by")
    .eq("id", input.parentTaskId)
    .single();
  const projectId = (parent as { project_id: string | null } | null)?.project_id ?? null;
  const createdBy = (parent as { created_by: string | null } | null)?.created_by ?? null;

  let count = 0;
  for (const item of input.items) {
    const title = item.title.trim();
    if (!title) continue;
    const childId = await insertFollowupChild(supabase, {
      parentTaskId: input.parentTaskId,
      projectId,
      title,
      dueDate: addWorkingDays(item.offsetDays, input.baseDateISO),
      primaryMemberId: input.primaryMemberId,
      supportMemberIds: input.supportMemberIds,
      createdBy,
    });
    if (!childId) continue;
    count += 1;
    if (item.subtaskId) {
      const { error: uErr } = await supabase
        .from("subtasks")
        .update({ followup_task_id: childId })
        .eq("id", item.subtaskId);
      if (uErr)
        console.error("createFollowupsManual: lỗi đánh dấu subtask", uErr);
    }
  }
  return count;
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
  if (patch.completed !== undefined)
    await syncSourceSubtaskDone(id, patch.completed);
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
  await syncSourceSubtaskDone(id, status === "hoan_thanh");
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
      "*, task_assignees ( member_id, is_primary ), subtasks!subtasks_task_id_fkey ( title, sort_order ), task_tags ( tag_id )",
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
