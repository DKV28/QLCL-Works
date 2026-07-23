// Logic thống kê cho Báo cáo — hàm thuần, tính từ danh sách công việc.
import type { TaskStatus, TaskWithAssignees } from "@/lib/types";
import { isOverdue, needsToStart } from "./overdue";

export function isDone(t: Pick<TaskWithAssignees, "status" | "completed_at">) {
  return t.status === "hoan_thanh" || !!t.completed_at;
}

export interface Summary {
  total: number;
  done: number;
  inProgress: number;
  notStarted: number;
  overdue: number;
  needStart: number;
  completionRate: number; // 0..1
}

export function summarize(tasks: TaskWithAssignees[]): Summary {
  let done = 0;
  let inProgress = 0;
  let notStarted = 0;
  let overdue = 0;
  let needStart = 0;

  for (const t of tasks) {
    if (isDone(t)) done += 1;
    else if (t.status === "dang_lam") inProgress += 1;
    else notStarted += 1;

    if (isOverdue(t)) overdue += 1;
    if (needsToStart(t)) needStart += 1;
  }

  const total = tasks.length;
  return {
    total,
    done,
    inProgress,
    notStarted,
    overdue,
    needStart,
    completionRate: total > 0 ? done / total : 0,
  };
}

export function statusDistribution(
  tasks: TaskWithAssignees[],
): Record<TaskStatus, number> {
  const out: Record<TaskStatus, number> = {
    chua_bat_dau: 0,
    dang_lam: 0,
    hoan_thanh: 0,
  };
  for (const t of tasks) {
    if (isDone(t)) out.hoan_thanh += 1;
    else out[t.status] += 1;
  }
  return out;
}

export interface GroupStat {
  key: string;
  label: string;
  total: number;
  done: number;
  rate: number; // 0..1
}

function groupCompletion(
  tasks: TaskWithAssignees[],
  keyOf: (t: TaskWithAssignees) => { key: string; label: string },
): GroupStat[] {
  const map = new Map<string, GroupStat>();
  for (const t of tasks) {
    const { key, label } = keyOf(t);
    let g = map.get(key);
    if (!g) {
      g = { key, label, total: 0, done: 0, rate: 0 };
      map.set(key, g);
    }
    g.total += 1;
    if (isDone(t)) g.done += 1;
  }
  const arr = Array.from(map.values());
  for (const g of arr) g.rate = g.total > 0 ? g.done / g.total : 0;
  return arr.sort((a, b) => b.total - a.total);
}

export function completionByProject(
  tasks: TaskWithAssignees[],
  projectName: (id: string) => string | undefined,
): GroupStat[] {
  return groupCompletion(tasks, (t) => ({
    key: t.project_id,
    label: projectName(t.project_id) ?? "Dự án khác",
  }));
}

export function completionByMember(tasks: TaskWithAssignees[]): GroupStat[] {
  return groupCompletion(tasks, (t) => ({
    key: t.primary?.id ?? "none",
    label: t.primary?.full_name ?? "Chưa giao",
  }));
}

export function completionByTeam(tasks: TaskWithAssignees[]): GroupStat[] {
  return groupCompletion(tasks, (t) => ({
    key: t.primary?.team_id ?? "none",
    label: t.primary?.team_name ?? "Chưa phân nhóm",
  }));
}

export interface OnTimeStat {
  onTime: number;
  late: number;
}

/** Trong các việc đã hoàn thành có deadline: đúng hạn vs trễ. */
export function onTimeStats(tasks: TaskWithAssignees[]): OnTimeStat {
  let onTime = 0;
  let late = 0;
  for (const t of tasks) {
    if (!isDone(t) || !t.due_date || !t.completed_at) continue;
    const completedDate = t.completed_at.slice(0, 10); // YYYY-MM-DD
    if (completedDate <= t.due_date) onTime += 1;
    else late += 1;
  }
  return { onTime, late };
}
