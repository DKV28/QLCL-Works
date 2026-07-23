"use server";

import { revalidatePath } from "next/cache";
import {
  createTask,
  duplicateTask,
  setStatus,
  softDeleteTask,
  toggleComplete,
  updateTask,
} from "@/lib/data/tasks";
import { recordActivity } from "@/lib/data/activity";
import { createNotification } from "@/lib/data/notifications";
import { TASK_STATUS_LABEL, type TaskPriority, type TaskStatus } from "@/lib/types";

export type ActionResult = { ok: true } | { ok: false; error: string };

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
  projectId: string,
  formData: FormData,
): Promise<ActionResult> {
  const fields = parseTaskForm(formData);
  if (!fields.title)
    return { ok: false, error: "Tên công việc không được để trống." };
  if (!fields.primary_member_id)
    return { ok: false, error: "Vui lòng chọn người phụ trách chính." };

  try {
    const task = await createTask({ project_id: projectId, ...fields });
    await recordActivity({
      task_id: task.id,
      project_id: projectId,
      action: "tao_cong_viec",
      detail: fields.title,
    });
    await createNotification({
      type: "cong_viec_moi",
      task_id: task.id,
      project_id: projectId,
      message: `Công việc mới: ${fields.title}`,
    });
  } catch (e) {
    return { ok: false, error: "Không tạo được công việc." };
  }

  revalidatePath(`/du-an/${projectId}`);
  revalidatePath("/cong-viec");
  return { ok: true };
}

/** Tạo công việc từ trang Danh sách tổng — dự án lấy từ form (project_id). */
export async function createTaskFromListAction(
  formData: FormData,
): Promise<ActionResult> {
  const projectId = String(formData.get("project_id") ?? "");
  if (!projectId) return { ok: false, error: "Vui lòng chọn dự án." };
  return createTaskAction(projectId, formData);
}

export async function updateTaskAction(
  id: string,
  projectId: string,
  formData: FormData,
): Promise<ActionResult> {
  const fields = parseTaskForm(formData);
  if (!fields.title)
    return { ok: false, error: "Tên công việc không được để trống." };
  if (!fields.primary_member_id)
    return { ok: false, error: "Vui lòng chọn người phụ trách chính." };

  try {
    await updateTask(id, fields);
    await recordActivity({
      task_id: id,
      project_id: projectId,
      action: "cap_nhat_cong_viec",
      detail: fields.title,
    });
  } catch (e) {
    return { ok: false, error: "Không cập nhật được công việc." };
  }

  revalidatePath(`/du-an/${projectId}`);
  revalidatePath("/cong-viec");
  return { ok: true };
}

export async function duplicateTaskAction(
  taskId: string,
  projectId: string,
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
  revalidatePath(`/du-an/${projectId}`);
  revalidatePath("/cong-viec");
  return { ok: true };
}

/** Đổi trạng thái công việc (dùng khi kéo thả Kanban). */
export async function updateTaskStatusAction(
  id: string,
  status: TaskStatus,
): Promise<ActionResult> {
  try {
    await setStatus(id, status);
    await recordActivity({
      task_id: id,
      action: "doi_trang_thai",
      detail: TASK_STATUS_LABEL[status],
    });
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
  try {
    await toggleComplete(id, completed);
    await recordActivity({
      task_id: id,
      action: completed ? "danh_dau_hoan_thanh" : "mo_lai",
    });
  } catch (e) {
    return { ok: false, error: "Không cập nhật được trạng thái." };
  }
  revalidatePath("/cong-viec");
  revalidatePath("/du-an", "layout");
  return { ok: true };
}

export async function deleteTaskAction(
  id: string,
  projectId: string,
): Promise<ActionResult> {
  try {
    await softDeleteTask(id);
  } catch (e) {
    return { ok: false, error: "Không xóa được công việc." };
  }
  revalidatePath(`/du-an/${projectId}`);
  revalidatePath("/cong-viec");
  return { ok: true };
}
