"use server";

import { revalidatePath } from "next/cache";
import {
  createNextRecurrence,
  createTask,
  duplicateTask,
  getTaskStepInfo,
  isTaskCompleted,
  setStatus,
  softDeleteTask,
  toggleComplete,
  updateTask,
  updateTaskStep,
} from "@/lib/data/tasks";
import { recordActivity } from "@/lib/data/activity";
import { createNotification } from "@/lib/data/notifications";
import { canWriteTask } from "@/lib/data/permissions";
import {
  getNextWorkflowStepSetting,
  getWorkflowStepSetting,
} from "@/lib/data/settings";
import {
  TASK_STATUS_LABEL,
  type TaskPriority,
  type TaskRepeat,
  type TaskStatus,
} from "@/lib/types";
import { addWorkingDays } from "@/lib/logic/working-days";
import { todayISO } from "@/lib/logic/overdue";

export type ActionResult = { ok: true } | { ok: false; error: string };

function taskSaveError(error: unknown, fallback: string): string {
  const value = error as { code?: string; message?: string } | null;
  const message = value?.message ?? "";
  if (value?.code === "42501" || message.toLowerCase().includes("row-level security")) {
    return "Tài khoản chưa được gán team hoặc không có quyền tạo công việc trong phạm vi này.";
  }
  if (message.includes("is_department_wide")) {
    return "Cơ sở dữ liệu chưa được cập nhật migration phân quyền team.";
  }
  return fallback;
}

function parseTaskForm(formData: FormData) {
  return {
    title: String(formData.get("title") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim() || null,
    start_date: String(formData.get("start_date") ?? "") || null,
    due_date: String(formData.get("due_date") ?? "") || null,
    priority: (String(formData.get("priority") ?? "trung_binh") ||
      "trung_binh") as TaskPriority,
    status: (String(formData.get("status") ?? "chua_bat_dau") ||
      "chua_bat_dau") as TaskStatus,
    repeat: (String(formData.get("repeat") ?? "none") || "none") as TaskRepeat,
    is_arising: formData.get("is_arising") === "on",
    is_department_wide: formData.get("is_department_wide") === "on",
    van_hanh_step: String(formData.get("van_hanh_step") ?? "").trim() || null,
    primary_member_id: String(formData.get("primary_member_id") ?? "") || null,
    support_member_ids: formData
      .getAll("support_member_ids")
      .map((v) => String(v))
      .filter(Boolean),
    tag_ids: formData
      .getAll("tag_ids")
      .map((v) => String(v))
      .filter(Boolean),
  };
}

export async function createTaskAction(
  projectId: string | null,
  formData: FormData,
): Promise<ActionResult> {
  const fields = parseTaskForm(formData);
  if (!fields.title)
    return { ok: false, error: "Tên công việc không được để trống." };
  if (!fields.primary_member_id)
    return { ok: false, error: "Vui lòng chọn người phụ trách chính." };

  try {
    const task = await createTask({ project_id: projectId, ...fields });
    await Promise.all([
      recordActivity({
        task_id: task.id,
        project_id: projectId,
        action: "tao_cong_viec",
        detail: fields.title,
      }),
      createNotification({
        type: "cong_viec_moi",
        task_id: task.id,
        project_id: projectId,
        message: `Công việc mới: ${fields.title}`,
      }),
    ]);
  } catch (e) {
    return { ok: false, error: taskSaveError(e, "Không tạo được công việc.") };
  }

  if (projectId) revalidatePath(`/du-an/${projectId}`);
  revalidatePath("/cong-viec");
  return { ok: true };
}

/** Tạo công việc từ trang Danh sách tổng — dự án là tùy chọn. */
export async function createTaskFromListAction(
  formData: FormData,
): Promise<ActionResult> {
  const projectId = String(formData.get("project_id") ?? "") || null;
  return createTaskAction(projectId, formData);
}

export async function updateTaskAction(
  id: string,
  projectId: string | null,
  formData: FormData,
): Promise<ActionResult> {
  const fields = parseTaskForm(formData);
  if (!fields.title)
    return { ok: false, error: "Tên công việc không được để trống." };
  if (!fields.primary_member_id)
    return { ok: false, error: "Vui lòng chọn người phụ trách chính." };
  if (!(await canWriteTask(id)))
    return { ok: false, error: "Bạn chỉ sửa được công việc do mình tạo." };

  try {
    await updateTask(id, fields);
    await recordActivity({
      task_id: id,
      project_id: projectId,
      action: "cap_nhat_cong_viec",
      detail: fields.title,
    });
  } catch (e) {
    return { ok: false, error: taskSaveError(e, "Không cập nhật được công việc.") };
  }

  if (projectId) revalidatePath(`/du-an/${projectId}`);
  revalidatePath("/cong-viec");
  return { ok: true };
}

export async function duplicateTaskAction(
  taskId: string,
  projectId: string | null,
): Promise<ActionResult> {
  try {
    const created = await duplicateTask(taskId);
    await recordActivity({
      task_id: created.id,
      project_id: projectId,
      action: "nhan_ban_cong_viec",
      detail: created.title,
    });
  } catch (e) {
    return { ok: false, error: "Không nhân bản được công việc." };
  }
  if (projectId) revalidatePath(`/du-an/${projectId}`);
  revalidatePath("/cong-viec");
  return { ok: true };
}

/** Đổi trạng thái công việc (dùng khi kéo thả Kanban). */
export async function updateTaskStatusAction(
  id: string,
  status: TaskStatus,
): Promise<ActionResult> {
  if (!(await canWriteTask(id)))
    return { ok: false, error: "Bạn chỉ đổi được trạng thái công việc do mình tạo." };
  try {
    // Chỉ sinh việc lặp khi CHUYỂN sang hoàn thành (tránh nhân đôi).
    const wasDone = status === "hoan_thanh" ? await isTaskCompleted(id) : false;
    await setStatus(id, status);
    await Promise.all([
      recordActivity({
        task_id: id,
        action: "doi_trang_thai",
        detail: TASK_STATUS_LABEL[status] ?? status,
      }),
      // Kéo sang "Hoàn thành" -> sinh lần lặp kế tiếp (chỉ khi thực sự chuyển).
      status === "hoan_thanh" && !wasDone
        ? createNextRecurrence(id)
        : Promise.resolve(),
    ]);
  } catch (e) {
    return { ok: false, error: "Không đổi được trạng thái." };
  }
  revalidatePath("/cong-viec");
  revalidatePath("/du-an", "layout");
  return { ok: true };
}

export async function toggleCompleteAction(
  id: string,
  completed: boolean,
): Promise<ActionResult> {
  if (!(await canWriteTask(id)))
    return { ok: false, error: "Bạn chỉ cập nhật được công việc do mình tạo." };
  try {
    // Chỉ sinh việc lặp khi CHUYỂN sang hoàn thành (tránh nhân đôi).
    const wasDone = completed ? await isTaskCompleted(id) : false;
    await toggleComplete(id, completed);
    await Promise.all([
      recordActivity({
        task_id: id,
        action: completed ? "danh_dau_hoan_thanh" : "mo_lai",
      }),
      // Đánh dấu hoàn thành -> sinh lần lặp kế tiếp (chỉ khi thực sự chuyển).
      completed && !wasDone ? createNextRecurrence(id) : Promise.resolve(),
    ]);
  } catch (e) {
    return { ok: false, error: "Không cập nhật được trạng thái." };
  }
  revalidatePath("/cong-viec");
  revalidatePath("/du-an", "layout");
  return { ok: true };
}

/**
 * Chuyển công việc quy trình vận hành sang BƯỚC TIẾP THEO.
 * - Bước cuối → đánh dấu Hoàn thành.
 * - Ngược lại → set bước kế + deadline = hôm nay + SLA bước kế (ngày làm việc, trừ CN).
 * Ghi vết vào nhật ký hoạt động ("chuyển bước").
 */
export async function advanceVanHanhStepAction(
  id: string,
): Promise<ActionResult> {
  if (!(await canWriteTask(id)))
    return { ok: false, error: "Bạn chỉ chuyển bước công việc do mình tạo." };
  try {
    const info = await getTaskStepInfo(id);
    if (!info || !info.van_hanh_step) {
      return { ok: false, error: "Công việc không thuộc quy trình vận hành." };
    }
    const current = info.van_hanh_step;
    const currentStep = await getWorkflowStepSetting(current);
    if (!currentStep) {
      return { ok: false, error: "Bước hiện tại không còn trong cấu hình quy trình." };
    }
    const next = await getNextWorkflowStepSetting(currentStep.sort_order);

    if (!next) {
      // Bước cuối: hoàn thành, giữ nguyên mã bước để còn biết dừng ở đâu.
      const wasDone = await isTaskCompleted(id);
      await updateTaskStep(id, {
        van_hanh_step: current,
        status: "hoan_thanh",
        completed: true,
      });
      await Promise.all([
        recordActivity({
          task_id: id,
          project_id: info.project_id,
          action: "chuyen_buoc",
          detail: `${currentStep.label} → Hoàn thành`,
        }),
        wasDone ? Promise.resolve() : createNextRecurrence(id),
      ]);
    } else {
      await updateTaskStep(id, {
        van_hanh_step: next.code,
        due_date: addWorkingDays(next.sla_days, todayISO()),
        status: "dang_lam",
        completed: false,
      });
      await recordActivity({
        task_id: id,
        project_id: info.project_id,
        action: "chuyen_buoc",
        detail: `${currentStep.label} → ${next.label}`,
      });
    }
  } catch (e) {
    return { ok: false, error: "Không chuyển được bước." };
  }

  revalidatePath("/cong-viec");
  revalidatePath("/du-an", "layout");
  return { ok: true };
}

export async function deleteTaskAction(
  id: string,
  projectId: string | null,
): Promise<ActionResult> {
  if (!(await canWriteTask(id)))
    return { ok: false, error: "Bạn chỉ xóa được công việc do mình tạo." };
  try {
    await softDeleteTask(id);
  } catch (e) {
    return { ok: false, error: "Không xóa được công việc." };
  }
  if (projectId) revalidatePath(`/du-an/${projectId}`);
  revalidatePath("/cong-viec");
  return { ok: true };
}
