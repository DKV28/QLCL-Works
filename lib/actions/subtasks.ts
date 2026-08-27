"use server";

import { revalidatePath } from "next/cache";
import {
  createSubtask,
  deleteSubtask,
  listSubtasksByTask,
  toggleSubtask,
  updateSubtask,
} from "@/lib/data/subtasks";
import type { Subtask } from "@/lib/types";

export type ActionResult = { ok: true } | { ok: false; error: string };

function revalidate() {
  revalidatePath("/cong-viec");
  revalidatePath("/du-an", "layout");
}

/** Tải nhiệm vụ con của một công việc (dùng khi mở chi tiết). */
export async function getSubtasksAction(taskId: string): Promise<Subtask[]> {
  try {
    return await listSubtasksByTask(taskId);
  } catch {
    return [];
  }
}

/** Chuẩn hóa số ngày hạn: số nguyên dương -> giữ; ngược lại -> null (không tự sinh). */
function normalizeOffset(value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(value) || value <= 0) return null;
  return Math.floor(value);
}

export async function createSubtaskAction(
  taskId: string,
  title: string,
  offsetDays: number | null = null,
): Promise<ActionResult> {
  const clean = title.trim();
  if (!clean) return { ok: false, error: "Tên nhiệm vụ con không được để trống." };

  try {
    await createSubtask(taskId, clean, normalizeOffset(offsetDays));
  } catch (e) {
    return { ok: false, error: "Không thêm được nhiệm vụ con." };
  }
  revalidate();
  return { ok: true };
}

export async function updateSubtaskAction(
  id: string,
  fields: { title?: string; offsetDays?: number | null },
): Promise<ActionResult> {
  const patch: { title?: string; followup_offset_days?: number | null } = {};
  if (fields.title !== undefined) {
    const clean = fields.title.trim();
    if (!clean)
      return { ok: false, error: "Tên nhiệm vụ con không được để trống." };
    patch.title = clean;
  }
  if (fields.offsetDays !== undefined)
    patch.followup_offset_days = normalizeOffset(fields.offsetDays);

  try {
    await updateSubtask(id, patch);
  } catch (e) {
    return { ok: false, error: "Không cập nhật được nhiệm vụ con." };
  }
  revalidate();
  return { ok: true };
}

export async function toggleSubtaskAction(
  id: string,
  isDone: boolean,
): Promise<ActionResult> {
  try {
    await toggleSubtask(id, isDone);
  } catch (e) {
    return { ok: false, error: "Không cập nhật được nhiệm vụ con." };
  }
  revalidate();
  return { ok: true };
}

export async function deleteSubtaskAction(id: string): Promise<ActionResult> {
  try {
    await deleteSubtask(id);
  } catch (e) {
    return { ok: false, error: "Không xóa được nhiệm vụ con." };
  }
  revalidate();
  return { ok: true };
}
