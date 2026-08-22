"use server";

import { todayISO } from "@/lib/logic/overdue";
import {
  listTaskDailyNotes,
  listTaskWorkLogs,
  setTaskDailyNote,
  setTaskWorkLog,
  setTaskWorkLogs,
} from "@/lib/data/work-logs";
import { createClient } from "@/lib/supabase/server";
import { getSessionUserId } from "@/lib/data/profiles";
import type { TaskDailyNote, TaskWorkLog } from "@/lib/types";

export type WorkLogResult =
  | { ok: true; logs?: TaskWorkLog[]; notes?: TaskDailyNote[] }
  | { ok: false; error: string };

export async function getTaskWorkLogsAction(
  workDate: string,
  memberId?: string,
): Promise<WorkLogResult> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(workDate)) {
    return { ok: false, error: "Ngày không hợp lệ." };
  }
  try {
    return { ok: true, logs: await listTaskWorkLogs(workDate, memberId) };
  } catch {
    return { ok: false, error: "Không tải được ghi nhận công việc." };
  }
}

export async function getTaskDailyNotesAction(
  noteDate: string,
  memberId?: string,
): Promise<WorkLogResult> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(noteDate)) {
    return { ok: false, error: "Ngày không hợp lệ." };
  }
  try {
    return { ok: true, notes: await listTaskDailyNotes(noteDate, memberId) };
  } catch {
    return { ok: false, error: "Không tải được ghi chú báo cáo." };
  }
}

export async function toggleTaskWorkLogAction(input: {
  taskId: string;
  memberId: string;
  workDate: string;
  enabled: boolean;
}): Promise<WorkLogResult> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.workDate) || input.workDate > todayISO()) {
    return { ok: false, error: "Không thể ghi nhận công việc cho ngày tương lai." };
  }
  const userId = await getSessionUserId();
  if (!userId) return { ok: false, error: "Bạn cần đăng nhập." };
  const supabase = createClient();

  const { count, error } = await supabase
    .from("task_assignees")
    .select("task_id", { count: "exact", head: true })
    .eq("task_id", input.taskId)
    .eq("member_id", input.memberId);
  if (error || !count) {
    return { ok: false, error: "Nhân sự này không được phân công vào công việc." };
  }

  try {
    await setTaskWorkLog(input);
    // Không revalidate: UI đã cập nhật optimistic; revalidate /bao-cao (force-dynamic)
    // sẽ tải lại toàn bộ task gây lag ~3s.
    return { ok: true };
  } catch {
    return { ok: false, error: "Không cập nhật được ghi nhận công việc." };
  }
}

export async function toggleTaskWorkLogsBatchAction(input: {
  taskIds: string[];
  memberId: string;
  workDate: string;
  enabled: boolean;
}): Promise<WorkLogResult> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.workDate) || input.workDate > todayISO()) {
    return { ok: false, error: "Không thể ghi nhận công việc cho ngày tương lai." };
  }
  const taskIds = Array.from(new Set(input.taskIds.filter(Boolean)));
  if (taskIds.length === 0) return { ok: true };

  const userId = await getSessionUserId();
  if (!userId) return { ok: false, error: "Bạn cần đăng nhập." };
  const supabase = createClient();

  // Tất cả task phải thuộc phân công của nhân sự này.
  const { data: rows, error } = await supabase
    .from("task_assignees")
    .select("task_id")
    .eq("member_id", input.memberId)
    .in("task_id", taskIds);
  if (error) {
    return { ok: false, error: "Không cập nhật được ghi nhận công việc." };
  }
  const assigned = new Set((rows ?? []).map((r) => (r as { task_id: string }).task_id));
  if (assigned.size !== taskIds.length) {
    return { ok: false, error: "Nhân sự này không được phân công vào công việc." };
  }

  try {
    await setTaskWorkLogs({
      taskIds,
      memberId: input.memberId,
      workDate: input.workDate,
      enabled: input.enabled,
    });
    return { ok: true };
  } catch {
    return { ok: false, error: "Không cập nhật được ghi nhận công việc." };
  }
}

export async function saveTaskDailyNoteAction(input: {
  taskId: string;
  memberId: string;
  noteDate: string;
  note: string;
}): Promise<WorkLogResult> {
  const note = input.note.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.noteDate) || input.noteDate > todayISO()) {
    return { ok: false, error: "Không thể ghi chú cho ngày tương lai." };
  }
  if (note.length > 2000) {
    return { ok: false, error: "Ghi chú không được vượt quá 2.000 ký tự." };
  }
  const userId = await getSessionUserId();
  if (!userId) return { ok: false, error: "Bạn cần đăng nhập." };
  const supabase = createClient();
  const { count, error } = await supabase
    .from("task_assignees")
    .select("task_id", { count: "exact", head: true })
    .eq("task_id", input.taskId)
    .eq("member_id", input.memberId);
  if (error || !count) {
    return { ok: false, error: "Nhân sự này không được phân công vào công việc." };
  }
  try {
    await setTaskDailyNote({ ...input, note });
    // Không revalidate: ghi chú đã hiển thị optimistic; tránh tải lại /bao-cao.
    return { ok: true };
  } catch {
    return { ok: false, error: "Không lưu được ghi chú báo cáo." };
  }
}
