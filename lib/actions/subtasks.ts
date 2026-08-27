"use server";

import { revalidatePath } from "next/cache";
import {
  createSubtask,
  deleteSubtask,
  listSubtasksByTask,
  toggleSubtask,
  updateSubtask,
} from "@/lib/data/subtasks";
import { createImmediateFollowup } from "@/lib/data/tasks";
import { addWorkingDays } from "@/lib/logic/working-days";
import { todayISO } from "@/lib/logic/overdue";
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

/** Kiểm tra chuỗi ngày yyyy-mm-dd hợp lệ. */
function isValidISODate(v: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(v + "T00:00:00Z");
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}

/**
 * Thêm nhiệm vụ con. Nếu có hạn (số ngày từ hôm nay HOẶC một ngày cụ thể) thì
 * TẠO NGAY một việc theo dõi (đề xuất) gắn với bài này — không chờ hoàn thành.
 * Ưu tiên `dueDate` (ngày cụ thể) nếu có; nếu không thì hôm nay + offsetDays
 * ngày làm việc.
 */
export async function createSubtaskAction(
  taskId: string,
  fields: {
    title: string;
    offsetDays?: number | null;
    dueDate?: string | null; // yyyy-mm-dd
  },
): Promise<ActionResult> {
  const clean = fields.title.trim();
  if (!clean) return { ok: false, error: "Tên nhiệm vụ con không được để trống." };

  const offset = normalizeOffset(fields.offsetDays);
  const dueDate = fields.dueDate?.trim() || null;
  if (dueDate && !isValidISODate(dueDate))
    return { ok: false, error: "Ngày hạn không hợp lệ." };

  // Hạn cho việc theo dõi: ngày cụ thể ưu tiên; nếu không thì hôm nay + số ngày.
  const due = dueDate ?? (offset ? addWorkingDays(offset, todayISO()) : null);

  try {
    const subtask = await createSubtask(taskId, clean, offset);
    if (due) {
      await createImmediateFollowup({
        subtaskId: subtask.id,
        parentTaskId: taskId,
        title: clean,
        dueDate: due,
      });
    }
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
