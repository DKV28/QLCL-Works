"use server";

import { revalidatePath } from "next/cache";
import {
  createFollowupsManual,
  createFollowupTasks,
  createNextRecurrence,
  createTask,
  createTasksBulk,
  duplicateTask,
  getTaskStepInfo,
  isTaskCompleted,
  setStatus,
  softDeleteTask,
  toggleComplete,
  updateTask,
  updateTaskStep,
  type FollowupManualInput,
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
import { createClient } from "@/lib/supabase/server";
import { getSessionUserId } from "@/lib/data/profiles";
import { parseBulkTasks } from "@/lib/logic/bulk-tasks";

export type ActionResult = { ok: true } | { ok: false; error: string };

function parseTaskForm(formData: FormData) {
  return {
    title: String(formData.get("title") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim() || null,
    due_date: String(formData.get("due_date") ?? "") || null,
    priority: (String(formData.get("priority") ?? "trung_binh") ||
      "trung_binh") as TaskPriority,
    repeat: (String(formData.get("repeat") ?? "none") || "none") as TaskRepeat,
    is_arising: formData.get("is_arising") === "on",
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
    return { ok: false, error: "Không tạo được công việc." };
  }

  // Không revalidate ở đây: client gọi router.refresh() sau khi đóng modal,
  // nên refetch chạy nền thay vì giữ promise action chờ re-render.
  return { ok: true };
}

/** Tạo công việc từ trang Danh sách tổng — dự án là tùy chọn. */
export async function createTaskFromListAction(
  formData: FormData,
): Promise<ActionResult> {
  const projectId = String(formData.get("project_id") ?? "") || null;
  return createTaskAction(projectId, formData);
}

export type BulkActionResult =
  | { ok: true; count: number }
  | { ok: false; error: string };

/**
 * Nhập hàng loạt: mỗi dòng dán vào -> một công việc.
 * Áp dụng chung người phụ trách/dự án/deadline/nhãn; dòng nào ghi kèm ngày
 * (vd "Tên | 25/09") thì dùng ngày riêng đó.
 */
export async function createTasksBulkAction(
  formData: FormData,
): Promise<BulkActionResult> {
  const projectId = String(formData.get("project_id") ?? "") || null;
  const primaryMemberId = String(formData.get("primary_member_id") ?? "") || null;
  const commonDue = String(formData.get("due_date") ?? "") || null;
  const supportMemberIds = formData
    .getAll("support_member_ids")
    .map((v) => String(v))
    .filter(Boolean);
  const tagIds = formData
    .getAll("tag_ids")
    .map((v) => String(v))
    .filter(Boolean);
  const raw = String(formData.get("lines") ?? "");

  if (!primaryMemberId)
    return { ok: false, error: "Vui lòng chọn người phụ trách chính." };

  const defaultYear = Number(todayISO().slice(0, 4));
  const parsed = parseBulkTasks(raw, defaultYear);
  if (parsed.length === 0)
    return { ok: false, error: "Chưa có dòng công việc hợp lệ để tạo." };

  let count = 0;
  try {
    count = await createTasksBulk({
      project_id: projectId,
      primary_member_id: primaryMemberId,
      support_member_ids: supportMemberIds,
      tag_ids: tagIds,
      due_date: commonDue,
      lines: parsed.map((line) => ({
        title: line.title,
        due_date: line.dueDate,
      })),
    });
    await createNotification({
      type: "cong_viec_moi",
      project_id: projectId,
      message: `Đã thêm ${count} công việc (nhập hàng loạt)`,
    });
  } catch (e) {
    return { ok: false, error: "Không tạo được công việc hàng loạt." };
  }

  if (projectId) revalidatePath(`/du-an/${projectId}`);
  revalidatePath("/cong-viec");
  return { ok: true, count };
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
    // Form sửa không còn ô trạng thái/hoàn thành — hoàn thành điều khiển bằng
    // checkbox (toggleCompleteAction), nên ở đây chỉ cập nhật nội dung công việc.
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

  // Không revalidate ở đây: client gọi router.refresh() sau khi đóng modal.
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
      // ... và tự sinh việc theo dõi (đề xuất) từ nhiệm vụ con có số ngày hạn.
      status === "hoan_thanh" && !wasDone
        ? createFollowupTasks(id)
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
      // ... và tự sinh việc theo dõi (đề xuất) từ nhiệm vụ con có số ngày hạn.
      completed && !wasDone ? createFollowupTasks(id) : Promise.resolve(),
    ]);
  } catch (e) {
    return { ok: false, error: "Không cập nhật được trạng thái." };
  }
  revalidatePath("/cong-viec");
  revalidatePath("/du-an", "layout");
  return { ok: true };
}

/**
 * Bật/tắt hoàn thành công việc TỪ MÀN BÁO CÁO NGÀY.
 * Ủy quyền theo phân công: chỉ cần đăng nhập và `memberId` (nhân sự đang được
 * báo cáo) thuộc phân công của công việc — vì bảng members độc lập với auth nên
 * không dùng canWriteTask (chỉ người tạo). KHÔNG revalidate /bao-cao để tránh
 * tải lại toàn bộ (gây lag); UI dùng optimistic update.
 */
export async function toggleTaskCompleteForReportAction(input: {
  taskId: string;
  memberId: string;
  completed: boolean;
}): Promise<ActionResult> {
  const userId = await getSessionUserId();
  if (!userId) return { ok: false, error: "Bạn cần đăng nhập." };
  const supabase = createClient();

  const { count, error } = await supabase
    .from("task_assignees")
    .select("task_id", { count: "exact", head: true })
    .eq("task_id", input.taskId)
    .eq("member_id", input.memberId);
  if (error || !count) {
    return { ok: false, error: "Nhân sự này không được phân công vào công việc." };
  }

  try {
    // Chỉ sinh việc lặp khi CHUYỂN sang hoàn thành (tránh nhân đôi).
    const wasDone = input.completed ? await isTaskCompleted(input.taskId) : false;
    await toggleComplete(input.taskId, input.completed);
    await Promise.all([
      recordActivity({
        task_id: input.taskId,
        action: input.completed ? "danh_dau_hoan_thanh" : "mo_lai",
      }),
      input.completed && !wasDone
        ? createNextRecurrence(input.taskId)
        : Promise.resolve(),
      input.completed && !wasDone
        ? createFollowupTasks(input.taskId)
        : Promise.resolve(),
    ]);
  } catch {
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
        wasDone ? Promise.resolve() : createFollowupTasks(id),
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

/** Kiểm tra chuỗi ngày yyyy-mm-dd hợp lệ. */
function isValidISODate(v: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(v + "T00:00:00Z");
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}

/**
 * Tạo việc theo dõi (đề xuất) THỦ CÔNG từ hộp thoại trên chi tiết công việc.
 * Mỗi item -> một công việc con với ngày hạn cụ thể đã chọn.
 */
export async function createFollowupsAction(
  input: FollowupManualInput,
): Promise<BulkActionResult> {
  const userId = await getSessionUserId();
  if (!userId) return { ok: false, error: "Bạn cần đăng nhập." };

  const items = (input.items ?? []).filter(
    (it) => it.title.trim() && it.dueDate && isValidISODate(it.dueDate),
  );
  if (items.length === 0)
    return { ok: false, error: "Chưa chọn đề xuất hợp lệ (cần tiêu đề và ngày hạn)." };

  let count = 0;
  try {
    count = await createFollowupsManual({ ...input, items });
    if (count > 0) {
      await recordActivity({
        task_id: input.parentTaskId,
        action: "tao_de_xuat",
        detail: `Tạo ${count} đề xuất theo dõi`,
      });
    }
  } catch (e) {
    return { ok: false, error: "Không tạo được đề xuất theo dõi." };
  }

  revalidatePath("/cong-viec");
  revalidatePath("/du-an", "layout");
  return { ok: true, count };
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
