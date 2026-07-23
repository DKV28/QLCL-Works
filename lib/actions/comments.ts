"use server";

import { revalidatePath } from "next/cache";
import {
  createComment,
  deleteComment,
  listCommentsByTask,
} from "@/lib/data/comments";
import { listActivityByTask, recordActivity } from "@/lib/data/activity";
import { createNotification } from "@/lib/data/notifications";
import { getTaskTitle } from "@/lib/data/tasks";
import type { ActivityEntry, Comment } from "@/lib/types";

export type ActionResult = { ok: true } | { ok: false; error: string };

/** Lấy bình luận + lịch sử của một công việc (gọi khi mở modal). */
export async function getTaskThreadAction(
  taskId: string,
): Promise<{ comments: Comment[]; activity: ActivityEntry[] }> {
  const [comments, activity] = await Promise.all([
    listCommentsByTask(taskId),
    listActivityByTask(taskId),
  ]);
  return { comments, activity };
}

export async function addCommentAction(
  taskId: string,
  body: string,
): Promise<ActionResult> {
  const clean = body.trim();
  if (!clean) return { ok: false, error: "Nội dung bình luận trống." };

  try {
    await createComment(taskId, clean);
    await recordActivity({
      task_id: taskId,
      action: "binh_luan",
      detail: clean.length > 80 ? clean.slice(0, 80) + "…" : clean,
    });
    const title = await getTaskTitle(taskId);
    await createNotification({
      type: "binh_luan_moi",
      task_id: taskId,
      message: `Bình luận mới${title ? `: ${title}` : ""}`,
    });
  } catch (e) {
    return { ok: false, error: "Không gửi được bình luận." };
  }
  revalidatePath("/cong-viec");
  return { ok: true };
}

export async function deleteCommentAction(id: string): Promise<ActionResult> {
  try {
    await deleteComment(id);
  } catch (e) {
    return { ok: false, error: "Không xóa được bình luận." };
  }
  return { ok: true };
}
