import { createClient } from "@/lib/supabase/server";
import type { TaskDailyNote, TaskWorkLog } from "@/lib/types";

export async function listTaskWorkLogs(
  workDate: string,
  memberId?: string,
): Promise<TaskWorkLog[]> {
  const supabase = createClient();
  let query = supabase
    .from("task_work_logs")
    .select("*")
    .eq("work_date", workDate);
  if (memberId) query = query.eq("member_id", memberId);
  const { data, error } = await query;
  if (error) throw error;
  return (data as TaskWorkLog[]) ?? [];
}

export async function setTaskWorkLog(input: {
  taskId: string;
  memberId: string;
  workDate: string;
  enabled: boolean;
}): Promise<void> {
  const supabase = createClient();
  if (input.enabled) {
    const { error } = await supabase.from("task_work_logs").upsert(
      {
        task_id: input.taskId,
        member_id: input.memberId,
        work_date: input.workDate,
      },
      { onConflict: "task_id,member_id,work_date" },
    );
    if (error) throw error;
    return;
  }
  const { error } = await supabase
    .from("task_work_logs")
    .delete()
    .eq("task_id", input.taskId)
    .eq("member_id", input.memberId)
    .eq("work_date", input.workDate);
  if (error) throw error;
}

export async function listTaskDailyNotes(
  noteDate: string,
  memberId?: string,
): Promise<TaskDailyNote[]> {
  const supabase = createClient();
  let query = supabase
    .from("task_daily_notes")
    .select("*")
    .eq("note_date", noteDate);
  if (memberId) query = query.eq("member_id", memberId);
  const { data, error } = await query;
  if (error) throw error;
  return (data as TaskDailyNote[]) ?? [];
}

export async function setTaskDailyNote(input: {
  taskId: string;
  memberId: string;
  noteDate: string;
  note: string;
}): Promise<void> {
  const supabase = createClient();
  if (!input.note) {
    const { error } = await supabase
      .from("task_daily_notes")
      .delete()
      .eq("task_id", input.taskId)
      .eq("member_id", input.memberId)
      .eq("note_date", input.noteDate);
    if (error) throw error;
    return;
  }
  const { error } = await supabase.from("task_daily_notes").upsert(
    {
      task_id: input.taskId,
      member_id: input.memberId,
      note_date: input.noteDate,
      note: input.note,
    },
    { onConflict: "task_id,member_id,note_date" },
  );
  if (error) throw error;
}
