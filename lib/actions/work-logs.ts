"use server";

import { revalidatePath } from "next/cache";
import { todayISO } from "@/lib/logic/overdue";
import { listTaskWorkLogs, setTaskWorkLog } from "@/lib/data/work-logs";
import { createClient } from "@/lib/supabase/server";
import type { TaskWorkLog } from "@/lib/types";

export type WorkLogResult =
  | { ok: true; logs?: TaskWorkLog[] }
  | { ok: false; error: string };

export async function getTaskWorkLogsAction(
  workDate: string,
  memberId?: string,
): Promise<WorkLogResult> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(workDate)) {
    return { ok: false, error: "Ngày không hợp lệ." };
  }
  try {
    return { ok: true, logs: await listTaskWorkLogs(workDate, memberId) };
  } catch {
    return { ok: false, error: "Không tải được ghi nhận công việc." };
  }
}

export async function toggleTaskWorkLogAction(input: {
  taskId: string;
  memberId: string;
  workDate: string;
  enabled: boolean;
}): Promise<WorkLogResult> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.workDate) || input.workDate > todayISO()) {
    return { ok: false, error: "Không thể ghi nhận công việc cho ngày tương lai." };
  }
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, error: "Bạn cần đăng nhập." };

  const { count, error } = await supabase
    .from("task_assignees")
    .select("task_id", { count: "exact", head: true })
    .eq("task_id", input.taskId)
    .eq("member_id", input.memberId);
  if (error || !count) {
    return { ok: false, error: "Nhân sự này không được phân công vào công việc." };
  }

  try {
    await setTaskWorkLog(input);
    revalidatePath("/cong-viec");
    revalidatePath("/bao-cao");
    return { ok: true };
  } catch {
    return { ok: false, error: "Không cập nhật được ghi nhận công việc." };
  }
}
