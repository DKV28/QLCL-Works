// Logic thuần: cộng ngày làm việc — KHÔNG phụ thuộc Supabase/UI, dễ test.
// Quy ước của QLCL: "ngày làm việc" chỉ trừ Chủ nhật (Thứ 7 vẫn tính).
// Ngày lễ tạm chưa trừ (bổ sung sau nếu cần).
import { todayISO } from "./overdue";

/** Trả về thứ trong tuần (0 = Chủ nhật … 6 = Thứ 7) của một ngày YYYY-MM-DD. */
function weekday(iso: string): number {
  // Dùng UTC để không lệ thuộc múi giờ máy chạy.
  return new Date(iso + "T00:00:00Z").getUTCDay();
}

/** Cộng thêm 1 ngày lịch vào YYYY-MM-DD (theo UTC, tránh lệch múi giờ). */
function nextCalendarDay(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

/**
 * Cộng `n` ngày làm việc vào `fromISO`, BỎ QUA Chủ nhật (Thứ 7 vẫn tính là
 * ngày làm việc). `fromISO` mặc định là hôm nay theo giờ Việt Nam.
 *
 * Ví dụ: từ Thứ 5 cộng 3 ngày làm việc → Thứ 6, Thứ 7, (bỏ CN), Thứ 2 = deadline Thứ 2.
 *
 * - n <= 0 hoặc không hợp lệ: trả về đúng `fromISO`.
 */
export function addWorkingDays(n: number, fromISO: string = todayISO()): string {
  if (!Number.isFinite(n) || n <= 0) return fromISO;
  let remaining = Math.ceil(n);
  let cursor = fromISO;
  while (remaining > 0) {
    cursor = nextCalendarDay(cursor);
    if (weekday(cursor) !== 0) remaining -= 1; // 0 = Chủ nhật → không tính
  }
  return cursor;
}
