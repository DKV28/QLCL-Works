// Logic lọc/sắp xếp công việc phía client — hàm thuần, dễ test.
import type { TaskWithAssignees } from "@/lib/types";
import { isOverdue } from "./overdue";

export interface TaskFilters {
  assigneeId?: string; // "" = tất cả
  fromDate?: string; // lọc theo due_date >= fromDate
  toDate?: string; // lọc theo due_date <= toDate
  keyword?: string; // tìm trong tên + mô tả
  onlyOverdue?: boolean;
}

export function filterTasks(
  tasks: TaskWithAssignees[],
  f: TaskFilters,
): TaskWithAssignees[] {
  const kw = f.keyword?.trim().toLowerCase();

  return tasks.filter((t) => {
    if (f.assigneeId && !t.assignees.some((a) => a.id === f.assigneeId)) {
      return false;
    }
    if (f.fromDate && (!t.due_date || t.due_date < f.fromDate)) return false;
    if (f.toDate && (!t.due_date || t.due_date > f.toDate)) return false;
    if (f.onlyOverdue && !isOverdue(t)) return false;
    if (kw) {
      const hay = `${t.title} ${t.description ?? ""}`.toLowerCase();
      if (!hay.includes(kw)) return false;
    }
    return true;
  });
}

const PRIORITY_ORDER = { cao: 0, trung_binh: 1, thap: 2 } as const;

/** Sắp xếp: quá hạn trước, rồi theo mức độ quan trọng, rồi theo deadline gần nhất. */
export function sortTasks(tasks: TaskWithAssignees[]): TaskWithAssignees[] {
  return [...tasks].sort((a, b) => {
    const ao = isOverdue(a) ? 0 : 1;
    const bo = isOverdue(b) ? 0 : 1;
    if (ao !== bo) return ao - bo;

    const ap = PRIORITY_ORDER[a.priority];
    const bp = PRIORITY_ORDER[b.priority];
    if (ap !== bp) return ap - bp;

    const ad = a.due_date ?? "9999-12-31";
    const bd = b.due_date ?? "9999-12-31";
    return ad.localeCompare(bd);
  });
}
