// Danh sách thanh tiến độ hoàn thành theo nhóm (dự án/người/team).
import type { GroupStat } from "@/lib/logic/stats";

export function BarList({ items }: { items: GroupStat[] }) {
  if (items.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-gray-400">Chưa có dữ liệu.</p>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((g) => (
        <div key={g.key}>
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="truncate text-gray-700 dark:text-gray-300">
              {g.label}
            </span>
            <span className="shrink-0 text-gray-500 dark:text-gray-400">
              {g.done}/{g.total} ({Math.round(g.rate * 100)}%)
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
            <div
              className="h-full rounded-full bg-brand"
              style={{ width: `${Math.round(g.rate * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
