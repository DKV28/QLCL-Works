// Data access: subtasks (nhiệm vụ con). Chỉ chứa query Supabase, không JSX.
import { createClient } from "@/lib/supabase/server";
import type { Subtask } from "@/lib/types";

export async function createSubtask(
  taskId: string,
  title: string,
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
    .insert({ task_id: taskId, title, sort_order: nextOrder })
    .select("*")
    .single();

  if (error) throw error;
  return data as Subtask;
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
