import { createClient } from "@/lib/supabase/server";
import type {
  TaskPriority,
  TaskPrioritySetting,
  TaskStatus,
  TaskStatusSetting,
} from "@/lib/types";

export async function listTaskPrioritySettings(): Promise<TaskPrioritySetting[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("task_priority_settings")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data as TaskPrioritySetting[]) ?? [];
}

export async function listTaskStatusSettings(): Promise<TaskStatusSetting[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("task_status_settings")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data as TaskStatusSetting[]) ?? [];
}

interface SettingUpdate {
  label: string;
  color: string;
  sort_order: number;
  is_active: boolean;
  is_default: boolean;
}

export async function updateTaskPrioritySetting(
  code: TaskPriority,
  input: SettingUpdate,
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc("update_task_priority_setting", {
    p_code: code,
    p_label: input.label,
    p_color: input.color,
    p_sort_order: input.sort_order,
    p_is_active: input.is_active,
    p_is_default: input.is_default,
  });
  if (error) throw error;
}

export async function updateTaskStatusSetting(
  code: TaskStatus,
  input: SettingUpdate,
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc("update_task_status_setting", {
    p_code: code,
    p_label: input.label,
    p_color: input.color,
    p_sort_order: input.sort_order,
    p_is_active: input.is_active,
    p_is_default: input.is_default,
  });
  if (error) throw error;
}
