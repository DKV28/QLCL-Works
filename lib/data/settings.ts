import { createClient } from "@/lib/supabase/server";
import {
  VAN_HANH_STEPS,
  workflowStepColorForRole,
} from "@/lib/logic/van-hanh";
import type {
  TaskPriority,
  TaskPrioritySetting,
  TaskStatus,
  TaskStatusSetting,
  WorkflowStepSetting,
  WorkflowTransition,
  WorkflowTransitionWithTarget,
} from "@/lib/types";

function fallbackWorkflowSteps(): WorkflowStepSetting[] {
  return VAN_HANH_STEPS.map((step) => ({
    code: step.code,
    label: step.label,
    role_label: step.role,
    color: workflowStepColorForRole(step.role),
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
  color: string;
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
    color: string;
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

// ---------- Nhánh chuyển bước (workflow_transitions) ----------

/** Toàn bộ cạnh chuyển bước, sắp theo bước nguồn rồi thứ tự nút. Rỗng nếu bảng
 * chưa tồn tại (migration chưa chạy) — nơi gọi sẽ rơi về luồng tuyến tính. */
export async function listWorkflowTransitions(): Promise<WorkflowTransition[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("workflow_transitions")
    .select("*")
    .order("from_code", { ascending: true })
    .order("sort_order", { ascending: true });
  if (error) return [];
  return (data as WorkflowTransition[]) ?? [];
}

/**
 * Các cạnh đi ra ĐANG BẬT của một bước, kèm nhãn + SLA của bước đích (để dựng
 * nút và tính lại deadline). Bỏ cạnh trỏ tới bước đã tắt. Trả về null khi bảng
 * transitions chưa tồn tại → nơi gọi rơi về luồng tuyến tính cũ.
 */
export async function getOutgoingTransitions(
  fromCode: string,
): Promise<WorkflowTransitionWithTarget[] | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("workflow_transitions")
    .select("*")
    .eq("from_code", fromCode)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (error) return null; // bảng chưa có → tín hiệu fallback tuyến tính
  const rows = (data as WorkflowTransition[]) ?? [];
  if (rows.length === 0) return [];

  const targetCodes = Array.from(new Set(rows.map((t) => t.to_code)));
  const { data: steps } = await supabase
    .from("workflow_step_settings")
    .select("code, label, sla_days, is_active")
    .in("code", targetCodes);
  const byCode = new Map(
    ((steps as Pick<WorkflowStepSetting, "code" | "label" | "sla_days" | "is_active">[]) ?? []).map(
      (s) => [s.code, s],
    ),
  );

  return rows
    .filter((t) => byCode.get(t.to_code)?.is_active !== false)
    .map((t) => {
      const target = byCode.get(t.to_code);
      return {
        ...t,
        to_label: target?.label ?? t.to_code,
        to_sla_days: target?.sla_days ?? 0,
      };
    });
}

export async function createWorkflowTransition(input: {
  from_code: string;
  to_code: string;
  label: string;
  kind: WorkflowTransition["kind"];
  sort_order: number;
  is_active: boolean;
}): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("workflow_transitions")
    .insert({ ...input, is_system: false });
  if (error) throw error;
}

export async function updateWorkflowTransition(
  id: string,
  input: {
    to_code: string;
    label: string;
    kind: WorkflowTransition["kind"];
    sort_order: number;
    is_active: boolean;
  },
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("workflow_transitions")
    .update(input)
    .eq("id", id);
  if (error) throw error;
}

export async function deleteWorkflowTransition(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("workflow_transitions")
    .delete()
    .eq("id", id);
  if (error) throw error;
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
