"use server";

import { revalidatePath } from "next/cache";
import {
  createSubtask,
  deleteSubtask,
  toggleSubtask,
} from "@/lib/data/subtasks";

export type ActionResult = { ok: true } | { ok: false; error: string };

function revalidate() {
  revalidatePath("/cong-viec");
  revalidatePath("/du-an", "layout");
}

export async function createSubtaskAction(
  taskId: string,
  title: string,
): Promise<ActionResult> {
  const clean = title.trim();
  if (!clean) return { ok: false, error: "Tên nhiệm vụ con không được để trống." };

  try {
    await createSubtask(taskId, clean);
  } catch (e) {
    return { ok: false, error: "Không thêm được nhiệm vụ con." };
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
