// Logic thuần liên quan tới hạn công việc — không phụ thuộc Supabase/UI, dễ test.
import type { Task } from "@/lib/types";

/** Trả về ngày hôm nay dạng YYYY-MM-DD theo giờ địa phương (VN). */
export function todayISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Công việc quá hạn: có deadline < hôm nay và chưa hoàn thành. */
export function isOverdue(task: Pick<Task, "due_date" | "completed_at" | "status">): boolean {
  if (!task.due_date) return false;
  if (task.completed_at || task.status === "hoan_thanh") return false;
  return task.due_date < todayISO();
}

/** Số ngày còn lại tới deadline (âm nếu đã quá hạn). null nếu không có deadline. */
export function daysUntilDue(dueDate: string | null): number | null {
  if (!dueDate) return null;
  const today = new Date(todayISO() + "T00:00:00");
  const due = new Date(dueDate + "T00:00:00");
  const diffMs = due.getTime() - today.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}
