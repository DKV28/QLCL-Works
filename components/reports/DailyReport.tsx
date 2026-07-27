"use client";

import { useEffect, useMemo, useState } from "react";
import { StatCard } from "./StatCard";
import {
  dailyReportFor,
  dailyReportText,
  type DailyReport as DR,
} from "@/lib/logic/reports";
import {
  getTaskWorkLogsAction,
  toggleTaskWorkLogAction,
} from "@/lib/actions/work-logs";
import { todayISO } from "@/lib/logic/overdue";
import type {
  MemberLite,
  TaskWithAssignees,
  TaskWorkLog,
} from "@/lib/types";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      className="btn-secondary text-sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          /* ignore */
        }
      }}
    >
      {copied ? "Đã sao chép" : "Sao chép"}
    </button>
  );
}

export function DailyReport({
  tasks,
  members,
}: {
  tasks: TaskWithAssignees[];
  members: MemberLite[];
}) {
  const [memberId, setMemberId] = useState("");
  const [reportDate, setReportDate] = useState(todayISO());
  const [workLogs, setWorkLogs] = useState<TaskWorkLog[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    getTaskWorkLogsAction(reportDate).then((result) => {
      if (cancelled) return;
      if (result.ok) setWorkLogs(result.logs ?? []);
      else setError(result.error);
    });
    return () => {
      cancelled = true;
    };
  }, [reportDate]);

  const allReports = useMemo(
    () => members.map((m) => dailyReportFor(tasks, m, reportDate, workLogs)),
    [tasks, members, reportDate, workLogs],
  );
  const selected: DR | null = memberId
    ? (allReports.find((r) => r.memberId === memberId) ?? null)
    : null;
  const assignedTasks = memberId
    ? tasks.filter(
        (task) =>
          task.primary?.id === memberId ||
          task.supporters.some((member) => member.id === memberId),
      )
    : [];
  const loggedTaskIds = new Set(
    workLogs
      .filter((log) => log.member_id === memberId)
      .map((log) => log.task_id),
  );

  function toggleLog(taskId: string, enabled: boolean) {
    if (!memberId) return;
    const previous = workLogs;
    setError(null);
    setWorkLogs((current) =>
      enabled
        ? [
            ...current.filter(
              (log) =>
                !(
                  log.task_id === taskId &&
                  log.member_id === memberId &&
                  log.work_date === reportDate
                ),
            ),
            {
              id: `optimistic-${taskId}-${memberId}-${reportDate}`,
              task_id: taskId,
              member_id: memberId,
              work_date: reportDate,
              created_by: "",
              created_at: new Date().toISOString(),
            },
          ]
        : current.filter(
            (log) =>
              !(
                log.task_id === taskId &&
                log.member_id === memberId &&
                log.work_date === reportDate
              ),
          ),
    );
    toggleTaskWorkLogAction({
      taskId,
      memberId,
      workDate: reportDate,
      enabled,
    }).then((result) => {
      if (!result.ok) {
        setWorkLogs(previous);
        setError(result.error);
      }
    });
  }

  return (
    <div>
      <div className="card no-print mb-6 p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label">Nhân viên</label>
            <select
              className="input"
              value={memberId}
              onChange={(e) => setMemberId(e.target.value)}
            >
              <option value="">— Xem tất cả —</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.full_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Ngày báo cáo</label>
            <input
              type="date"
              className="input"
              max={todayISO()}
              value={reportDate}
              onChange={(e) => setReportDate(e.target.value || todayISO())}
            />
          </div>
        </div>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>

      {selected ? (
        <div>
          <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="A · Tổng trong ngày" value={selected.a} />
            <StatCard label="B · Đã hoàn thành" value={selected.b} tone="green" />
            <StatCard label="C · Chưa hoàn thành" value={selected.c} tone="orange" />
            <StatCard label="D · Ngày mai + tồn" value={selected.d} tone="blue" />
          </div>

          <div className="card mb-4 p-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Nội dung báo cáo</h3>
              <CopyButton text={dailyReportText(selected)} />
            </div>
            <pre className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">
              {dailyReportText(selected)}
            </pre>
          </div>

          <div className="card p-4">
            <h3 className="mb-2 text-sm font-semibold">
              Việc trong ngày ({selected.todayTasks.length})
            </h3>
            <ul className="space-y-1 text-sm">
              {selected.todayTasks.map((t) => (
                <li key={t.id} className="flex items-center gap-2">
                  <span
                    className={
                      t.completed_at?.slice(0, 10) === reportDate
                        ? "text-green-600"
                        : "text-gray-400"
                    }
                  >
                    {t.completed_at?.slice(0, 10) === reportDate ? "✓" : "○"}
                  </span>
                  <span className="text-gray-800 dark:text-gray-200">
                    {t.title}
                  </span>
                </li>
              ))}
              {selected.todayTasks.length === 0 && (
                <li className="text-gray-400">Không có việc nào.</li>
              )}
            </ul>
          </div>

          <div className="card no-print mt-4 p-4">
            <h3 className="mb-1 text-sm font-semibold">
              Ghi nhận công việc đã thực hiện
            </h3>
            <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
              Chọn các công việc đã tham gia trong ngày, kể cả công việc kéo dài
              từ ngày trước.
            </p>
            <div className="max-h-72 space-y-2 overflow-y-auto">
              {assignedTasks.map((task) => (
                <label
                  key={task.id}
                  className="flex items-start gap-2 rounded border border-gray-100 p-2 text-sm dark:border-gray-800"
                >
                  <input
                    type="checkbox"
                    checked={loggedTaskIds.has(task.id)}
                    onChange={(event) => toggleLog(task.id, event.target.checked)}
                    className="mt-0.5 h-4 w-4 accent-brand"
                  />
                  <span>
                    {task.title}
                    <span className="ml-2 text-xs text-gray-400">
                      {task.primary?.id === memberId ? "Phụ trách chính" : "Hỗ trợ"}
                    </span>
                  </span>
                </label>
              ))}
              {assignedTasks.length === 0 && (
                <p className="text-sm text-gray-400">Không có công việc được phân công.</p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500 dark:border-gray-800 dark:text-gray-400">
                <th className="p-3">Nhân viên</th>
                <th className="p-3 text-center">A</th>
                <th className="p-3 text-center">B</th>
                <th className="p-3 text-center">C</th>
                <th className="p-3 text-center">D</th>
              </tr>
            </thead>
            <tbody>
              {allReports.map((r) => (
                <tr
                  key={r.memberId}
                  className="border-b border-gray-100 last:border-0 dark:border-gray-800"
                >
                  <td className="p-3 font-medium">{r.memberName}</td>
                  <td className="p-3 text-center">{r.a}</td>
                  <td className="p-3 text-center text-green-600">{r.b}</td>
                  <td className="p-3 text-center text-orange-600">{r.c}</td>
                  <td className="p-3 text-center text-brand">{r.d}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
