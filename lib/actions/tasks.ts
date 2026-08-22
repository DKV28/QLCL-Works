"use server";

import { revalidatePath } from "next/cache";
import {
  createNextRecurrence,
  createTask,
  duplicateTask,
  getTaskStepInfo,
  isTaskCompleted,
  setStatus,
  setTaskCompletedAt,
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
import { createClient } from "@/lib/supabase/server";
import { getSessionUserId } from "@/lib/data/profiles";

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
    // Phát hiện chuyển trạng thái hoàn thành ngay trong form sửa, để đồng bộ
    // completed_at và sinh việc lặp kế tiếp (trước đây bị bỏ sót ở luồng này).
    const wasDone = await isTaskCompleted(id);
    const willBeDone = fields.status === "hoan_thanh";

    await updateTask(id, fields);

    if (willBeDone !== wasDone) {
      await setTaskCompletedAt(id, willBeDone ? new Date().toISOString() : null);
    }

    await Promise.all([
      recordActivity({
        task_id: id,
        project_id: projectId,
        action: "cap_nhat_cong_viec",
        detail: fields.title,
      }),
      // Chuyển sang hoàn thành lần đầu -> sinh lần lặp kế tiếp.
      willBeDone && !wasDone ? createNextRecurrence(id) : Promise.resolve(),
    ]);
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
