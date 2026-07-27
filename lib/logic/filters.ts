// Logic lọc/sắp xếp công việc phía client — hàm thuần, dễ test.
import type { TaskWithAssignees } from "@/lib/types";
import { isOverdue } from "./overdue";

export interface TaskFilters {
  projectId?: string; // "" = tất cả dự án
  assigneeId?: string; // "" = tất cả (khớp cả phụ trách chính lẫn hỗ trợ)
  teamId?: string; // "" = tất cả (khớp team của bất kỳ người phụ trách nào)
  tagId?: string; // "" = tất cả (khớp công việc có nhãn này)
  statusCode?: string; // "" = tất cả
  fromDate?: string; // lọc theo due_date >= fromDate
  toDate?: string; // lọc theo due_date <= toDate
  keyword?: string; // tìm trong tên + mô tả
  onlyOverdue?: boolean;
}

/** Tất cả người phụ trách (chính + hỗ trợ) của một công việc. */
function allAssignees(t: TaskWithAssignees) {
  return t.primary ? [t.primary, ...t.supporters] : t.supporters;
}

export function filterTasks(
  tasks: TaskWithAssignees[],
  f: TaskFilters,
): TaskWithAssignees[] {
  const kw = f.keyword?.trim().toLowerCase();

  return tasks.filter((t) => {
    if (f.projectId && t.project_id !== f.projectId) return false;
    const people = allAssignees(t);
    if (f.assigneeId && !people.some((a) => a.id === f.assigneeId)) {
      return false;
    }
    if (f.teamId && !people.some((a) => a.team_id === f.teamId)) {
      return false;
    }
    if (f.tagId && !t.tags.some((tg) => tg.id === f.tagId)) {
      return false;
    }
    if (f.statusCode && t.status !== f.statusCode) return false;
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

/** Sắp xếp: quá hạn trước, rồi theo mức độ quan trọng, rồi theo deadline gần nhất. */
export function sortTasks(
  tasks: TaskWithAssignees[],
  priorityOrder: Record<string, number> = {
    cao: 10,
    trung_binh: 20,
    thap: 30,
  },
): TaskWithAssignees[] {
  return [...tasks].sort((a, b) => {
    const ao = isOverdue(a) ? 0 : 1;
    const bo = isOverdue(b) ? 0 : 1;
    if (ao !== bo) return ao - bo;

    const ap = priorityOrder[a.priority] ?? Number.MAX_SAFE_INTEGER;
    const bp = priorityOrder[b.priority] ?? Number.MAX_SAFE_INTEGER;
    if (ap !== bp) return ap - bp;

    const ad = a.due_date ?? "9999-12-31";
    const bd = b.due_date ?? "9999-12-31";
    return ad.localeCompare(bd);
  });
}
