// Logic báo cáo ngày (A/B/C/D) và báo cáo tuần — hàm thuần.
import type { MemberLite, TaskWithAssignees, TaskWorkLog } from "@/lib/types";
import { isDone } from "./stats";
import { todayISO, toVNDate } from "./overdue";
import { formatDMY } from "./dates";

function addDaysISO(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function completedDate(t: TaskWithAssignees): string | null {
  // completed_at lưu theo UTC → quy về ngày giờ Việt Nam để so cho khớp reportDate.
  return t.completed_at ? toVNDate(t.completed_at) : null;
}

/**
 * Công việc được xem là "đã hoàn thành" trong báo cáo ngày `reportDate` khi:
 *  - mốc completed_at rơi đúng ngày reportDate (theo giờ VN), HOẶC
 *  - đã đánh dấu hoàn thành (status hoàn thành) nhưng thiếu mốc completed_at,
 *    và đang xem báo cáo của hôm nay.
 * Dùng chung cho bộ đếm B và dấu tick ✓ để hai nơi luôn nhất quán.
 */
export function isDoneOnReport(
  t: TaskWithAssignees,
  reportDate: string,
): boolean {
  const done = completedDate(t);
  if (done) return done === reportDate;
  return reportDate === todayISO() && isDone(t);
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
 * Báo cáo ngày của một người gồm công việc phụ trách chính/hỗ trợ:
 *  - được chọn vào My day, HOẶC
 *  - có deadline đúng ngày báo cáo.
 */
export function dailyReportFor(
  tasks: TaskWithAssignees[],
  member: MemberLite,
  reportDate = todayISO(),
  workLogs: TaskWorkLog[] = [],
): DailyReport {
  const tomorrow = addDaysISO(reportDate, 1);
  const mine = tasks.filter(
    (task) =>
      task.primary?.id === member.id ||
      task.supporters.some((supporter) => supporter.id === member.id),
  );
  const loggedIds = new Set(
    workLogs
      .filter(
        (log) =>
          log.member_id === member.id && log.work_date === reportDate,
      )
      .map((log) => log.task_id),
  );
  const todayTasks = mine.filter(
    (task) => task.due_date === reportDate || loggedIds.has(task.id),
  );

  const b = todayTasks.filter((task) => isDoneOnReport(task, reportDate)).length;
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

export function dailyReportText(
  r: DailyReport,
  notes: Record<string, string> = {},
): string {
  const lines = [
    `A = Công việc My day hoặc có deadline trong ngày = ${r.a}`,
    `B = Tổng số công việc trong ngày đã hoàn thành = ${r.b}`,
    `C = Tổng số công việc trong ngày chưa hoàn thành = ${r.c}`,
    `D = Số công việc mới (ngày mai) + chưa hoàn thành hôm nay = ${r.d}`,
  ];
  const notedTasks = r.todayTasks.filter((task) => notes[task.id]);
  if (notedTasks.length) {
    lines.push(
      "",
      "Ghi chú:",
      ...notedTasks.map((task) => `- ${task.title}: ${notes[task.id]}`),
    );
  }
  return lines.join("\n");
}

// ---------- Báo cáo tuần ----------

/**
 * Ngày bắt đầu của kỳ báo cáo tuần đã đóng gần nhất.
 * Kỳ chạy từ Thứ Bảy đến Thứ Sáu; báo cáo được chốt vào Thứ Bảy.
 */
export function weekStartOf(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  const dow = d.getUTCDay(); // 0=CN..5=T6..6=T7
  const daysSinceFriday = (dow - 5 + 7) % 7;
  d.setUTCDate(d.getUTCDate() - daysSinceFriday - 6);
  return d.toISOString().slice(0, 10);
}

export function weekEndOf(weekStart: string): string {
  return addDaysISO(weekStart, 6);
}

export interface WeeklyReport {
  weekStart: string; // Thứ Bảy
  weekEnd: string; // Thứ Sáu (T6 tuần này)
  nextWeekEnd: string; // T6 tuần kế
  a: number; // A: task có deadline trong tuần (T7 → T6)
  b: number; // B: trong A, đã hoàn thành
  c: number; // C: trong A, chưa hoàn thành
  arisingCount: number; // số việc phát sinh trong A
  arisingPct: number; // 0..1 = arisingCount / a
  d: number; // D: chưa hoàn thành, có deadline ≤ T6 tuần kế
  aTasks: TaskWithAssignees[];
  cTasks: TaskWithAssignees[]; // A chưa hoàn thành
  arisingTasks: TaskWithAssignees[];
  dTasks: TaskWithAssignees[]; // kế hoạch tuần kế
}

function inRange(d: string | null, start: string, end: string): boolean {
  return !!d && d >= start && d <= end;
}

/**
 * Báo cáo tuần theo format A/B/C/D của Phòng QLCL:
 *  - A = task CÓ deadline rơi trong tuần này (T7 → T6);
 *  - B/C = trong A đã / chưa hoàn thành;
 *  - % phát sinh = việc phát sinh trong A ÷ A;
 *  - D (tuần kế) = task CHƯA hoàn thành có deadline ≤ T6 tuần kế
 *    (tự động gồm C sau khi gia hạn + việc mới có deadline ≤ T6 tuần kế).
 */
export function weeklyReport(
  tasks: TaskWithAssignees[],
  weekStart: string,
  teamId?: string,
): WeeklyReport {
  const weekEnd = weekEndOf(weekStart);
  const nextWeekEnd = addDaysISO(weekEnd, 7);

  const scoped = tasks.filter((t) => {
    if (teamId) {
      const people = t.primary ? [t.primary, ...t.supporters] : t.supporters;
      if (!people.some((p) => p.team_id === teamId)) return false;
    }
    return true;
  });

  // A: task có deadline trong tuần này.
  const aTasks = scoped.filter((t) => inRange(t.due_date, weekStart, weekEnd));
  const cTasks = aTasks.filter((t) => !isDone(t));
  const arisingTasks = aTasks.filter((t) => t.is_arising);
  const a = aTasks.length;

  // D: chưa hoàn thành, có deadline ≤ T6 tuần kế (lũy kế).
  const dTasks = scoped.filter(
    (t) => !isDone(t) && !!t.due_date && t.due_date <= nextWeekEnd,
  );

  return {
    weekStart,
    weekEnd,
    nextWeekEnd,
    a,
    b: a - cTasks.length,
    c: cTasks.length,
    arisingCount: arisingTasks.length,
    arisingPct: a > 0 ? arisingTasks.length / a : 0,
    d: dTasks.length,
    aTasks,
    cTasks,
    arisingTasks,
    dTasks,
  };
}

export function weeklyReportText(r: WeeklyReport): string {
  const pct = Math.round(r.arisingPct * 100);
  return [
    `Phần 1: Báo cáo công việc trong tuần (${formatDMY(r.weekStart)} → ${formatDMY(r.weekEnd)})`,
    `- A (tổng số task có deadline tính đến T6) = ${r.a}`,
    `- B (tổng số task có deadline tính đến T6 và đã hoàn thành) = ${r.b}`,
    `- C (tổng số task có deadline tính đến T6 và chưa hoàn thành) = ${r.c}`,
    `Tổng số công việc phát sinh chiếm khoảng ${pct}% tổng công việc.`,
    ``,
    `Phần 2: Báo cáo công việc tuần tiếp theo (đến T6 ${formatDMY(r.nextWeekEnd)})`,
    `- D (gồm C sau khi gia hạn và các công việc mới có deadline tính đến T6 tuần tiếp) = ${r.d}`,
  ].join("\n");
}
