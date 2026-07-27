// Logic báo cáo ngày (A/B/C/D) và báo cáo tuần — hàm thuần.
import type { MemberLite, TaskWithAssignees, TaskWorkLog } from "@/lib/types";
import { isDone } from "./stats";
import { todayISO } from "./overdue";

function addDaysISO(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function completedDate(t: TaskWithAssignees): string | null {
  return t.completed_at ? t.completed_at.slice(0, 10) : null;
}

// ---------- Báo cáo ngày ----------

export interface DailyReport {
  memberId: string;
  memberName: string;
  a: number; // tổng việc trong ngày
  b: number; // đã hoàn thành hôm nay
  c: number; // chưa hoàn thành (a - b)
  d: number; // việc mới ngày mai + c
  todayTasks: TaskWithAssignees[];
  tomorrowNew: TaskWithAssignees[];
}

/**
 * "Việc thực hiện trong hôm nay" của một người (phụ trách chính):
 *  - đã hoàn thành hôm nay, HOẶC
 *  - chưa hoàn thành và đã tới ngày làm (start_date <= hôm nay hoặc không có start).
 */
export function dailyReportFor(
  tasks: TaskWithAssignees[],
  member: MemberLite,
  reportDate = todayISO(),
  workLogs: TaskWorkLog[] = [],
): DailyReport {
  const tomorrow = addDaysISO(reportDate, 1);
  const mine = tasks.filter((t) => t.primary?.id === member.id);
  const loggedIds = new Set(
    workLogs
      .filter(
        (log) =>
          log.member_id === member.id && log.work_date === reportDate,
      )
      .map((log) => log.task_id),
  );
  const todayTasks = tasks.filter(
    (task) =>
      (task.primary?.id === member.id && task.start_date === reportDate) ||
      (task.primary?.id === member.id && completedDate(task) === reportDate) ||
      loggedIds.has(task.id),
  );

  const b = todayTasks.filter(
    (task) =>
      completedDate(task) === reportDate ||
      (reportDate === todayISO() && isDone(task) && !task.completed_at),
  ).length;
  const c = todayTasks.length - b;

  const tomorrowNew = mine.filter(
    (t) =>
      (!completedDate(t) || completedDate(t)! > reportDate) &&
      (t.start_date === tomorrow || t.due_date === tomorrow) &&
      !todayTasks.includes(t),
  );

  return {
    memberId: member.id,
    memberName: member.full_name,
    a: todayTasks.length,
    b,
    c,
    d: tomorrowNew.length + c,
    todayTasks,
    tomorrowNew,
  };
}

export function dailyReportText(r: DailyReport): string {
  return [
    `A = Tổng số công việc trong ngày = ${r.a}`,
    `B = Tổng số công việc trong ngày đã hoàn thành = ${r.b}`,
    `C = Tổng số công việc trong ngày chưa hoàn thành = ${r.c}`,
    `D = Số công việc mới (ngày mai) + chưa hoàn thành hôm nay = ${r.d}`,
  ].join("\n");
}

// ---------- Báo cáo tuần ----------

/** Thứ Hai của tuần chứa ngày iso. */
export function weekStartOf(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  const dow = d.getUTCDay(); // 0=CN..6=T7
  const diff = dow === 0 ? -6 : 1 - dow; // về thứ Hai
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10);
}

export function weekEndOf(weekStart: string): string {
  return addDaysISO(weekStart, 6);
}

export interface WeeklyReport {
  weekStart: string;
  weekEnd: string;
  planned: TaskWithAssignees[];
  arising: TaskWithAssignees[];
  done: number;
  notDone: number;
}

function inRange(d: string | null, start: string, end: string): boolean {
  return !!d && d >= start && d <= end;
}

export function weeklyReport(
  tasks: TaskWithAssignees[],
  weekStart: string,
  teamId?: string,
): WeeklyReport {
  const weekEnd = weekEndOf(weekStart);

  const scoped = tasks.filter((t) => {
    if (teamId) {
      const people = t.primary ? [t.primary, ...t.supporters] : t.supporters;
      if (!people.some((p) => p.team_id === teamId)) return false;
    }
    return true;
  });

  const planned = scoped.filter(
    (t) => !t.is_arising && inRange(t.due_date, weekStart, weekEnd),
  );
  const arising = scoped.filter(
    (t) =>
      t.is_arising &&
      (inRange(t.due_date, weekStart, weekEnd) ||
        inRange(t.created_at.slice(0, 10), weekStart, weekEnd)),
  );

  const all = [...planned, ...arising];
  const done = all.filter((t) => isDone(t)).length;

  return {
    weekStart,
    weekEnd,
    planned,
    arising,
    done,
    notDone: all.length - done,
  };
}

export function weeklyReportText(r: WeeklyReport): string {
  const total = r.planned.length + r.arising.length;
  return [
    `Báo cáo tuần (${r.weekStart} → ${r.weekEnd})`,
    `- Công việc hoạch định trong tuần: ${r.planned.length}`,
    `- Công việc phát sinh trong tuần: ${r.arising.length}`,
    `- Tổng: ${total}`,
    `- Hoàn thành: ${r.done}`,
    `- Chưa hoàn thành: ${r.notDone}`,
  ].join("\n");
}
