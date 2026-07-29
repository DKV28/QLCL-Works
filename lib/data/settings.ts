import { createClient } from "@/lib/supabase/server";
import { VAN_HANH_STEPS } from "@/lib/logic/van-hanh";
import type {
  TaskPriority,
  TaskPrioritySetting,
  TaskStatus,
  TaskStatusSetting,
  WorkflowStepSetting,
} from "@/lib/types";

function fallbackWorkflowSteps(): WorkflowStepSetting[] {
  return VAN_HANH_STEPS.map((step) => ({
    code: step.code,
    label: step.label,
    role_label: step.role,
    sla_days: step.slaDays,
    sort_order: step.order * 10,
    is_active: true,
    is_system: true,
    created_at: "",
    updated_at: "",
  }));
}

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

export async function listWorkflowStepSettings(): Promise<WorkflowStepSetting[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("workflow_step_settings")
    .select("*")
    .order("sort_order", { ascending: true });
  // Giữ ứng dụng hoạt động trong lúc deploy code và migration chưa đồng thời.
  if (error) return fallbackWorkflowSteps();
  return (data as WorkflowStepSetting[]) ?? [];
}

export async function createWorkflowStepSetting(input: {
  code: string;
  label: string;
  role_label: string;
  sla_days: number;
  sort_order: number;
  is_active: boolean;
}): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("workflow_step_settings").insert({
    ...input,
    is_system: false,
  });
  if (error) throw error;
}

export async function updateWorkflowStepSetting(
  code: string,
  input: {
    label: string;
    role_label: string;
    sla_days: number;
    sort_order: number;
    is_active: boolean;
  },
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("workflow_step_settings")
    .update(input)
    .eq("code", code);
  if (error) throw error;
}

export async function deleteWorkflowStepSetting(code: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("workflow_step_settings")
    .delete()
    .eq("code", code)
    .eq("is_system", false);
  if (error) throw error;
}

export async function countTasksUsingWorkflowStep(code: string): Promise<number> {
  const supabase = createClient();
  const { count, error } = await supabase
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .eq("van_hanh_step", code)
    .is("deleted_at", null);
  if (error) throw error;
  return count ?? 0;
}

export async function getWorkflowStepSetting(
  code: string,
): Promise<WorkflowStepSetting | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("workflow_step_settings")
    .select("*")
    .eq("code", code)
    .maybeSingle();
  if (error) {
    return fallbackWorkflowSteps().find((step) => step.code === code) ?? null;
  }
  return (data as WorkflowStepSetting | null) ?? null;
}

export async function getNextWorkflowStepSetting(
  currentSortOrder: number,
): Promise<WorkflowStepSetting | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("workflow_step_settings")
    .select("*")
    .eq("is_active", true)
    .gt("sort_order", currentSortOrder)
    .order("sort_order", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) {
    return (
      fallbackWorkflowSteps().find(
        (step) => step.sort_order > currentSortOrder,
      ) ?? null
    );
  }
  return (data as WorkflowStepSetting | null) ?? null;
}

interface SettingUpdate {
  label: string;
  color: string;
  sort_order: number;
  is_active: boolean;
  is_default: boolean;
}

interface SettingCreate extends SettingUpdate {
  code: string;
}

export async function createTaskPrioritySetting(
  input: SettingCreate,
): Promise<void> {
  const supabase = createClient();
  if (input.is_default) {
    await supabase
      .from("task_priority_settings")
      .update({ is_default: false })
      .eq("is_default", true);
  }
  const { error } = await supabase.from("task_priority_settings").insert({
    ...input,
    is_system: false,
  });
  if (error) throw error;
}

export async function createTaskStatusSetting(
  input: SettingCreate,
): Promise<void> {
  const supabase = createClient();
  if (input.is_default) {
    await supabase
      .from("task_status_settings")
      .update({ is_default: false })
      .eq("is_default", true);
  }
  const { error } = await supabase.from("task_status_settings").insert({
    ...input,
    is_system: false,
    is_terminal: false,
  });
  if (error) throw error;
}

export async function deleteTaskPrioritySetting(code: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("task_priority_settings")
    .delete()
    .eq("code", code)
    .eq("is_system", false);
  if (error) throw error;
}

export async function deleteTaskStatusSetting(code: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("task_status_settings")
    .delete()
    .eq("code", code)
    .eq("is_system", false);
  if (error) throw error;
}

export async function countTasksUsingSetting(
  field: "priority" | "status",
  code: string,
): Promise<number> {
  const supabase = createClient();
  const { count, error } = await supabase
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .eq(field, code)
    .is("deleted_at", null);
  if (error) throw error;
  return count ?? 0;
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
