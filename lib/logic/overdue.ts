// Logic thuần liên quan tới hạn công việc — không phụ thuộc Supabase/UI, dễ test.
import type { Task } from "@/lib/types";

const VN_DATE_FORMAT = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Ho_Chi_Minh",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/**
 * Đổi một thời điểm (Date hoặc chuỗi ISO/UTC) sang ngày YYYY-MM-DD theo giờ
 * Việt Nam (Asia/Ho_Chi_Minh). Dùng để so ngày nhất quán với todayISO(),
 * tránh lệch ngày do completed_at lưu theo UTC.
 */
export function toVNDate(instant: Date | string): string {
  const date = typeof instant === "string" ? new Date(instant) : instant;
  const parts = VN_DATE_FORMAT.formatToParts(date);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

/**
 * Ngày hôm nay dạng YYYY-MM-DD, LUÔN theo giờ Việt Nam (Asia/Ho_Chi_Minh) —
 * nhất quán giữa máy chủ (Vercel chạy UTC) và trình duyệt.
 */
export function todayISO(): string {
  return toVNDate(new Date());
}

/** Công việc quá hạn: có deadline < hôm nay và chưa hoàn thành. */
export function isOverdue(task: Pick<Task, "due_date" | "completed_at" | "status">): boolean {
  if (!task.due_date) return false;
  if (task.completed_at || task.status === "hoan_thanh") return false;
  return task.due_date < todayISO();
}

/**
 * "Trễ khởi động": đã tới/qua ngày bắt đầu nhưng công việc vẫn ở trạng thái
 * "Chưa bắt đầu" (chưa chuyển sang Đang làm). Dùng để cảnh báo (hiện đỏ).
 */
export function needsToStart(
  task: Pick<Task, "start_date" | "status" | "completed_at">,
): boolean {
  if (!task.start_date) return false;
  if (task.completed_at || task.status !== "chua_bat_dau") return false;
  return task.start_date <= todayISO();
}

/** Cần chú ý (hiện đỏ): quá hạn deadline hoặc trễ khởi động. */
export function needsAttention(
  task: Pick<Task, "due_date" | "start_date" | "status" | "completed_at">,
): boolean {
  return isOverdue(task) || needsToStart(task);
}

/** Số ngày còn lại tới deadline (âm nếu đã quá hạn). null nếu không có deadline. */
export function daysUntilDue(dueDate: string | null): number | null {
  if (!dueDate) return null;
  const today = new Date(todayISO() + "T00:00:00");
  const due = new Date(dueDate + "T00:00:00");
  const diffMs = due.getTime() - today.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}
