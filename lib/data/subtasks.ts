// Data access: subtasks (nhiệm vụ con). Chỉ chứa query Supabase, không JSX.
import { createClient } from "@/lib/supabase/server";
import type { Subtask } from "@/lib/types";

/** Nhiệm vụ con của một công việc (tải khi mở chi tiết). */
export async function listSubtasksByTask(taskId: string): Promise<Subtask[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("subtasks")
    .select("*")
    .eq("task_id", taskId)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data as Subtask[]) ?? [];
}

export async function createSubtask(
  taskId: string,
  title: string,
  offsetDays: number | null = null,
): Promise<Subtask> {
  const supabase = createClient();

  // Đặt sort_order kế tiếp
  const { data: maxRow } = await supabase
    .from("subtasks")
    .select("sort_order")
    .eq("task_id", taskId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextOrder = (maxRow?.sort_order ?? -1) + 1;

  const { data, error } = await supabase
    .from("subtasks")
    .insert({
      task_id: taskId,
      title,
      sort_order: nextOrder,
      followup_offset_days: offsetDays,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as Subtask;
}

/** Cập nhật tiêu đề và/hoặc số ngày hạn của một nhiệm vụ con. */
export async function updateSubtask(
  id: string,
  fields: { title?: string; followup_offset_days?: number | null },
): Promise<void> {
  const supabase = createClient();
  const patch: Record<string, unknown> = {};
  if (fields.title !== undefined) patch.title = fields.title;
  if (fields.followup_offset_days !== undefined)
    patch.followup_offset_days = fields.followup_offset_days;
  if (Object.keys(patch).length === 0) return;
  const { error } = await supabase.from("subtasks").update(patch).eq("id", id);
  if (error) throw error;
}

export async function toggleSubtask(id: string, isDone: boolean): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("subtasks")
    .update({ is_done: isDone })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteSubtask(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("subtasks").delete().eq("id", id);
  if (error) throw error;
}
