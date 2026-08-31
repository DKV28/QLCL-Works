// Logic báo cáo ngày (A/B/C/D) và báo cáo tuần — hàm thuần.
import type { MemberLite, TaskWithAssignees, TaskWorkLog } from "@/lib/types";
import { isDone } from "./stats";
import { todayISO, toVNDate } from "./overdue";
import { formatDMY } from "./dates";
import { nextWorkingDay } from "./working-days";

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
  // "Ngày mai" = ngày làm việc kế tiếp, bỏ qua Chủ nhật (T7 → T2, không phải CN).
  const tomorrow = nextWorkingDay(reportDate);
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

  // Bắt việc rơi trong khoảng (reportDate, tomorrow] — với T7 khoảng này gồm cả
  // CN (phòng thủ nếu lỡ có việc dính ngày CN) lẫn T2; ngày thường chỉ là hôm sau.
  const inTomorrowWindow = (d: string | null): boolean =>
    !!d && d > reportDate && d <= tomorrow;
  const tomorrowNew = mine.filter(
    (t) =>
      (!completedDate(t) || completedDate(t)! > reportDate) &&
      (inTomorrowWindow(t.start_date) || inTomorrowWindow(t.due_date)) &&
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

/** Danh sách người phụ trách (chính + hỗ trợ) của một công việc. */
export function assigneesOf(t: TaskWithAssignees): MemberLite[] {
  return t.primary ? [t.primary, ...t.supporters] : t.supporters;
}

/**
 * Số "lượt người phụ trách" của một công việc trong phạm vi báo cáo:
 *  - lọc theo cá nhân → 1 nếu người đó có tham gia, ngược lại 0;
 *  - lọc theo team → số người phụ trách thuộc team đó;
 *  - không lọc → tổng số người phụ trách.
 * Nhờ đó việc do nhiều người phụ trách được tính đúng số lượt (giống báo cáo ngày).
 */
export function assigneeCountInScope(
  t: TaskWithAssignees,
  scope: { teamId?: string; memberId?: string } = {},
): number {
  const people = assigneesOf(t);
  if (scope.memberId) return people.some((p) => p.id === scope.memberId) ? 1 : 0;
  if (scope.teamId) return people.filter((p) => p.team_id === scope.teamId).length;
  return people.length;
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
  opts: { teamId?: string; memberId?: string } = {},
): WeeklyReport {
  const { teamId, memberId } = opts;
  const weekEnd = weekEndOf(weekStart);
  const nextWeekEnd = addDaysISO(weekEnd, 7);

  const scoped = tasks.filter((t) => {
    const people = t.primary ? [t.primary, ...t.supporters] : t.supporters;
    // Lọc theo cá nhân: chỉ việc mà người đó là phụ trách chính hoặc hỗ trợ.
    if (memberId && !people.some((p) => p.id === memberId)) return false;
    if (teamId && !people.some((p) => p.team_id === teamId)) return false;
    return true;
  });

  // A: task có deadline trong tuần này.
  const aTasks = scoped.filter((t) => inRange(t.due_date, weekStart, weekEnd));
  const bTasks = aTasks.filter((t) => isDone(t));
  const cTasks = aTasks.filter((t) => !isDone(t));
  const arisingTasks = aTasks.filter((t) => t.is_arising);

  // D: chưa hoàn thành, có deadline ≤ T6 tuần kế (lũy kế).
  const dTasks = scoped.filter(
    (t) => !isDone(t) && !!t.due_date && t.due_date <= nextWeekEnd,
  );

  // Đếm theo LƯỢT NGƯỜI PHỤ TRÁCH: việc do nhiều người phụ trách tính nhiều lượt
  // (nhất quán với báo cáo ngày). Trong phạm vi cá nhân/team thì chỉ tính người
  // thuộc phạm vi đó.
  const sumPeople = (list: TaskWithAssignees[]) =>
    list.reduce((acc, t) => acc + assigneeCountInScope(t, { teamId, memberId }), 0);

  const a = sumPeople(aTasks);
  const arisingCount = sumPeople(arisingTasks);

  return {
    weekStart,
    weekEnd,
    nextWeekEnd,
    a,
    b: sumPeople(bTasks),
    c: sumPeople(cTasks),
    arisingCount,
    arisingPct: a > 0 ? arisingCount / a : 0,
    d: sumPeople(dTasks),
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
    `(A/B/C/D tính theo lượt người phụ trách — việc nhiều người tính nhiều lượt)`,
    `- A (tổng số lượt có deadline tính đến T6) = ${r.a}`,
    `- B (tổng số lượt có deadline tính đến T6 và đã hoàn thành) = ${r.b}`,
    `- C (tổng số lượt có deadline tính đến T6 và chưa hoàn thành) = ${r.c}`,
    `Tổng số công việc phát sinh chiếm khoảng ${pct}% tổng công việc.`,
    ``,
    `Phần 2: Báo cáo công việc tuần tiếp theo (đến T6 ${formatDMY(r.nextWeekEnd)})`,
    `- D (gồm C sau khi gia hạn và các công việc mới có deadline tính đến T6 tuần tiếp) = ${r.d}`,
  ].join("\n");
}
