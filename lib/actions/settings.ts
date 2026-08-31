"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/data/profiles";
import {
  countTasksUsingSetting,
  countTasksUsingWorkflowStep,
  createTaskPrioritySetting,
  createTaskStatusSetting,
  createWorkflowStepSetting,
  createWorkflowTransition,
  deleteTaskPrioritySetting,
  deleteTaskStatusSetting,
  deleteWorkflowStepSetting,
  deleteWorkflowTransition,
  listWorkflowStepSettings,
  listWorkflowTransitions,
  updateTaskPrioritySetting,
  updateTaskStatusSetting,
  updateWorkflowStepSetting,
  updateWorkflowTransition,
} from "@/lib/data/settings";
import type {
  TaskPriority,
  TaskStatus,
  WorkflowStepSetting,
  WorkflowTransition,
  WorkflowTransitionKind,
} from "@/lib/types";
import { DEFAULT_WORKFLOW_STEP_COLOR } from "@/lib/logic/van-hanh";

export type ActionResult = { ok: true } | { ok: false; error: string };

async function requireAdmin(): Promise<ActionResult> {
  const me = await getCurrentProfile();
  if (!me || me.role !== "admin") {
    return { ok: false, error: "Chỉ Quản trị viên được thay đổi cài đặt." };
  }
  return { ok: true };
}

function parse(formData: FormData) {
  const label = String(formData.get("label") ?? "").trim();
  const color = String(formData.get("color") ?? "").trim();
  const sortOrder = Number(formData.get("sort_order") ?? 0);
  const isDefault = formData.get("is_default") === "on";
  return {
    label,
    color,
    sort_order: Number.isFinite(sortOrder) ? sortOrder : 0,
    is_active: isDefault || formData.get("is_active") === "on",
    is_default: isDefault,
  };
}

function codeFromLabel(label: string): string {
  return label
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48);
}

async function createSetting(
  kind: "priority" | "status",
  formData: FormData,
): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard;
  const input = parse(formData);
  const code = codeFromLabel(input.label);
  if (!input.label || !code) {
    return { ok: false, error: "Tên hiển thị không hợp lệ." };
  }
  if (!/^#[0-9a-f]{6}$/i.test(input.color)) {
    return { ok: false, error: "Màu phải có định dạng #RRGGBB." };
  }
  try {
    if (kind === "priority") {
      await createTaskPrioritySetting({ code, ...input });
    } else {
      await createTaskStatusSetting({ code, ...input });
    }
    revalidate();
    return { ok: true };
  } catch {
    return {
      ok: false,
      error: "Không thể tạo mục mới. Tên hoặc mã có thể đã tồn tại.",
    };
  }
}

export async function createPrioritySettingAction(
  formData: FormData,
): Promise<ActionResult> {
  return createSetting("priority", formData);
}

export async function createStatusSettingAction(
  formData: FormData,
): Promise<ActionResult> {
  return createSetting("status", formData);
}

async function deleteSetting(
  kind: "priority" | "status",
  code: string,
): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard;
  try {
    const count = await countTasksUsingSetting(kind, code);
    if (count > 0) {
      return {
        ok: false,
        error: `Không thể xóa vì đang có ${count} công việc sử dụng. Hãy tắt mục này.`,
      };
    }
    if (kind === "priority") await deleteTaskPrioritySetting(code);
    else await deleteTaskStatusSetting(code);
    revalidate();
    return { ok: true };
  } catch {
    return { ok: false, error: "Không thể xóa mục cấu hình hệ thống hoặc mục đang được sử dụng." };
  }
}

export async function deletePrioritySettingAction(
  code: string,
): Promise<ActionResult> {
  return deleteSetting("priority", code);
}

export async function deleteStatusSettingAction(
  code: string,
): Promise<ActionResult> {
  return deleteSetting("status", code);
}

function revalidate() {
  revalidatePath("/cai-dat");
  revalidatePath("/cong-viec");
  revalidatePath("/du-an", "layout");
}

export async function updatePrioritySettingAction(
  code: TaskPriority,
  formData: FormData,
): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard;
  const input = parse(formData);
  if (!input.label) return { ok: false, error: "Tên hiển thị không được trống." };
  if (!/^#[0-9a-f]{6}$/i.test(input.color)) {
    return { ok: false, error: "Màu phải có định dạng #RRGGBB." };
  }
  try {
    await updateTaskPrioritySetting(code, input);
    revalidate();
    return { ok: true };
  } catch {
    return { ok: false, error: "Không cập nhật được mức độ quan trọng." };
  }
}

export async function updateStatusSettingAction(
  code: TaskStatus,
  formData: FormData,
): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard;
  const input = parse(formData);
  if (!input.label) return { ok: false, error: "Tên hiển thị không được trống." };
  if (!/^#[0-9a-f]{6}$/i.test(input.color)) {
    return { ok: false, error: "Màu phải có định dạng #RRGGBB." };
  }
  try {
    await updateTaskStatusSetting(code, input);
    revalidate();
    return { ok: true };
  } catch {
    return { ok: false, error: "Không cập nhật được trạng thái." };
  }
}

function parseWorkflowStep(formData: FormData) {
  const label = String(formData.get("label") ?? "").trim();
  const roleLabel = String(formData.get("role_label") ?? "").trim();
  const color =
    String(formData.get("color") ?? "").trim() ||
    DEFAULT_WORKFLOW_STEP_COLOR;
  const slaDays = Number(formData.get("sla_days") ?? 0);
  const sortOrder = Number(formData.get("sort_order") ?? 0);
  return {
    label,
    role_label: roleLabel,
    color,
    sla_days: Number.isInteger(slaDays) ? slaDays : -1,
    sort_order: Number.isFinite(sortOrder) ? sortOrder : 0,
    is_active: formData.get("is_active") === "on",
  };
}

function validateWorkflowStep(input: ReturnType<typeof parseWorkflowStep>): string | null {
  if (!input.label) return "Tên bước không được để trống.";
  if (!/^#[0-9a-f]{6}$/i.test(input.color)) {
    return "Màu phải có định dạng #RRGGBB.";
  }
  if (input.sla_days < 0 || input.sla_days > 365) {
    return "SLA phải là số nguyên từ 0 đến 365 ngày làm việc.";
  }
  return null;
}

export async function getWorkflowStepsAction(): Promise<WorkflowStepSetting[]> {
  return listWorkflowStepSettings();
}

export async function createWorkflowStepAction(
  formData: FormData,
): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard;
  const input = parseWorkflowStep(formData);
  const error = validateWorkflowStep(input);
  if (error) return { ok: false, error };
  const code = codeFromLabel(input.label);
  if (!code) return { ok: false, error: "Không thể tạo mã hệ thống từ tên bước." };
  try {
    await createWorkflowStepSetting({ code, ...input });
    revalidate();
    return { ok: true };
  } catch {
    return { ok: false, error: "Không thể thêm bước. Tên hoặc mã có thể đã tồn tại." };
  }
}

export async function updateWorkflowStepAction(
  code: string,
  formData: FormData,
): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard;
  const input = parseWorkflowStep(formData);
  const error = validateWorkflowStep(input);
  if (error) return { ok: false, error };
  try {
    await updateWorkflowStepSetting(code, input);
    revalidate();
    return { ok: true };
  } catch {
    return { ok: false, error: "Không thể cập nhật bước quy trình." };
  }
}

export async function deleteWorkflowStepAction(code: string): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard;
  try {
    const count = await countTasksUsingWorkflowStep(code);
    if (count > 0) {
      return {
        ok: false,
        error: `Không thể xóa vì đang có ${count} công việc sử dụng. Hãy tắt bước này.`,
      };
    }
    await deleteWorkflowStepSetting(code);
    revalidate();
    return { ok: true };
  } catch {
    return {
      ok: false,
      error: "Không thể xóa bước hệ thống hoặc bước đang được sử dụng.",
    };
  }
}

// ---------- Nhánh chuyển bước (workflow_transitions) ----------

const TRANSITION_KINDS: WorkflowTransitionKind[] = ["forward", "reject", "back"];

function parseWorkflowTransition(formData: FormData) {
  const kindRaw = String(formData.get("kind") ?? "forward").trim();
  const sortOrder = Number(formData.get("sort_order") ?? 0);
  return {
    from_code: String(formData.get("from_code") ?? "").trim(),
    to_code: String(formData.get("to_code") ?? "").trim(),
    label: String(formData.get("label") ?? "").trim(),
    kind: (TRANSITION_KINDS.includes(kindRaw as WorkflowTransitionKind)
      ? kindRaw
      : "forward") as WorkflowTransitionKind,
    sort_order: Number.isFinite(sortOrder) ? sortOrder : 0,
    is_active: formData.get("is_active") === "on",
  };
}

function validateWorkflowTransition(
  input: ReturnType<typeof parseWorkflowTransition>,
): string | null {
  if (!input.from_code || !input.to_code) return "Thiếu bước nguồn hoặc bước đích.";
  if (input.from_code === input.to_code) return "Bước đích phải khác bước nguồn.";
  if (!input.label) return "Nhãn nút không được để trống.";
  return null;
}

export async function getWorkflowTransitionsAction(): Promise<WorkflowTransition[]> {
  return listWorkflowTransitions();
}

export async function createWorkflowTransitionAction(
  formData: FormData,
): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard;
  const input = parseWorkflowTransition(formData);
  const error = validateWorkflowTransition(input);
  if (error) return { ok: false, error };
  try {
    await createWorkflowTransition(input);
    revalidate();
    return { ok: true };
  } catch {
    return { ok: false, error: "Không thể thêm nhánh. Cạnh này có thể đã tồn tại." };
  }
}

export async function updateWorkflowTransitionAction(
  id: string,
  formData: FormData,
): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard;
  const input = parseWorkflowTransition(formData);
  const error = validateWorkflowTransition(input);
  if (error) return { ok: false, error };
  try {
    await updateWorkflowTransition(id, {
      to_code: input.to_code,
      label: input.label,
      kind: input.kind,
      sort_order: input.sort_order,
      is_active: input.is_active,
    });
    revalidate();
    return { ok: true };
  } catch {
    return { ok: false, error: "Không thể cập nhật nhánh chuyển bước." };
  }
}

export async function deleteWorkflowTransitionAction(
  id: string,
): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard;
  try {
    await deleteWorkflowTransition(id);
    revalidate();
    return { ok: true };
  } catch {
    return { ok: false, error: "Không thể xóa nhánh chuyển bước." };
  }
}
