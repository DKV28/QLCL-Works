// Hiển thị ngày theo hướng "Hôm nay / Ngày mai / Hôm qua" so với ngày hiện tại.
import { daysUntilDue } from "./overdue";

/** dd/mm/yyyy */
export function formatDMY(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

/**
 * Nhãn ngày thân thiện:
 * - Hôm nay / Ngày mai / Hôm qua khi trong khoảng ±1 ngày
 * - còn lại: dd/mm/yyyy
 */
export function formatFriendlyDate(iso: string | null): string {
  if (!iso) return "—";
  const diff = daysUntilDue(iso); // 0 = hôm nay, 1 = ngày mai, -1 = hôm qua
  if (diff === 0) return "Hôm nay";
  if (diff === 1) return "Ngày mai";
  if (diff === -1) return "Hôm qua";
  return formatDMY(iso);
}
