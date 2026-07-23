"use server";

import { revalidatePath } from "next/cache";
import {
  createTask,
  softDeleteTask,
  toggleComplete,
  updateTask,
} from "@/lib/data/tasks";
import type { TaskPriority, TaskStatus } from "@/lib/types";

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
    assignee_id: String(formData.get("assignee_id") ?? "") || null,
  };
}

export async function createTaskAction(
  projectId: string,
  formData: FormData,
): Promise<ActionResult> {
  const fields = parseTaskForm(formData);
  if (!fields.title)
    return { ok: false, error: "Tên công việc không được để trống." };

  try {
    await createTask({ project_id: projectId, ...fields });
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

  try {
    await updateTask(id, fields);
  } catch (e) {
    return { ok: false, error: "Không cập nhật được công việc." };
  }

  revalidatePath(`/du-an/${projectId}`);
  revalidatePath("/cong-viec");
  return { ok: true };
}

export async function toggleCompleteAction(
  id: string,
  completed: boolean,
): Promise<ActionResult> {
  try {
    await toggleComplete(id, completed);
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
