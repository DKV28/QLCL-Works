"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { StatCard } from "./StatCard";
import {
  dailyReportFor,
  dailyReportText,
  isDoneOnReport,
  type DailyReport as DR,
} from "@/lib/logic/reports";
import {
  getTaskDailyNotesAction,
  getTaskWorkLogsAction,
  saveTaskDailyNoteAction,
  toggleTaskWorkLogAction,
} from "@/lib/actions/work-logs";
import { Modal } from "@/components/ui/Modal";
import { todayISO } from "@/lib/logic/overdue";
import { formatFriendlyDate } from "@/lib/logic/dates";
import type {
  MemberLite,
  TaskDailyNote,
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

function normalizeSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("vi")
    .trim();
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
  const [dailyNotes, setDailyNotes] = useState<TaskDailyNote[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<"today" | "tomorrow">("today");
  const [myDayOpen, setMyDayOpen] = useState(false);
  const [myDayQuery, setMyDayQuery] = useState("");
  const currentDateRef = useRef(todayISO());

  useEffect(() => {
    const syncReportDate = () => {
      const nextDate = todayISO();
      if (nextDate === currentDateRef.current) return;
      const previousDate = currentDateRef.current;
      currentDateRef.current = nextDate;
      setReportDate((selectedDate) =>
        selectedDate === previousDate ? nextDate : selectedDate,
      );
    };
    const timer = window.setInterval(syncReportDate, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    setDetailTab("today");
    setMyDayOpen(false);
    setMyDayQuery("");
  }, [memberId, reportDate]);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    Promise.all([
      getTaskWorkLogsAction(reportDate),
      getTaskDailyNotesAction(reportDate),
    ]).then(([logResult, noteResult]) => {
      if (cancelled) return;
      if (logResult.ok) setWorkLogs(logResult.logs ?? []);
      else setError(logResult.error);
      if (noteResult.ok) setDailyNotes(noteResult.notes ?? []);
      else setError(noteResult.error);
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
  const normalizedMyDayQuery = normalizeSearch(myDayQuery);
  const filteredAssignedTasks = normalizedMyDayQuery
    ? assignedTasks.filter((task) =>
        normalizeSearch(
          [
            task.title,
            task.description ?? "",
            ...task.tags.map((tag) => tag.name),
          ].join(" "),
        ).includes(normalizedMyDayQuery),
      )
    : assignedTasks;
  const loggedTaskIds = new Set(
    workLogs
      .filter((log) => log.member_id === memberId)
      .map((log) => log.task_id),
  );
  const noteByTaskId = Object.fromEntries(
    dailyNotes
      .filter((note) => note.member_id === memberId)
      .map((note) => [note.task_id, note.note]),
  );

  function changeNote(taskId: string, note: string) {
    if (!memberId) return;
    setDailyNotes((current) => {
      const others = current.filter(
        (item) =>
          !(
            item.task_id === taskId &&
            item.member_id === memberId &&
            item.note_date === reportDate
          ),
      );
      if (!note) return others;
      return [
        ...others,
        {
          id: `draft-${taskId}-${memberId}-${reportDate}`,
          task_id: taskId,
          member_id: memberId,
          note_date: reportDate,
          note,
          created_by: "",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];
    });
  }

  function saveNote(taskId: string) {
    if (!memberId) return;
    setError(null);
    saveTaskDailyNoteAction({
      taskId,
      memberId,
      noteDate: reportDate,
      note: noteByTaskId[taskId] ?? "",
    }).then((result) => {
      if (!result.ok) setError(result.error);
    });
  }

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
              <CopyButton text={dailyReportText(selected, noteByTaskId)} />
            </div>
            <pre className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">
              {dailyReportText(selected, noteByTaskId)}
            </pre>
          </div>

          <div className="card p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div
                className="segmented min-w-0 overflow-x-auto"
                role="tablist"
                aria-label="Chi tiết báo cáo ngày"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={detailTab === "today"}
                  onClick={() => setDetailTab("today")}
                  className={`segmented-item ${
                    detailTab === "today"
                      ? "segmented-item-active"
                      : ""
                  }`}
                >
                  Việc trong ngày ({selected.todayTasks.length})
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={detailTab === "tomorrow"}
                  onClick={() => setDetailTab("tomorrow")}
                  className={`segmented-item ${
                    detailTab === "tomorrow"
                      ? "segmented-item-active"
                      : ""
                  }`}
                >
                  Việc ngày mai ({selected.tomorrowNew.length})
                </button>
              </div>
              <button
                type="button"
                onClick={() => setMyDayOpen(true)}
                className="no-print flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand text-xl font-medium leading-none text-white hover:opacity-90"
                aria-label="Mở My day"
                title="My day"
              >
                +
              </button>
            </div>

            {detailTab === "today" ? (
              <>
                <p className="mb-2 text-xs text-gray-400">
                  Ghi chú được tự động lưu khi bạn rời khỏi ô nhập.
                </p>
                <ul className="space-y-2 text-sm">
                  {selected.todayTasks.map((t) => {
                    const done = isDoneOnReport(t, reportDate);
                    return (
                    <li
                      key={t.id}
                      className="grid gap-2 rounded-md border border-gray-100 p-2 sm:grid-cols-[minmax(0,1fr)_minmax(240px,40%)] sm:items-center dark:border-gray-800"
                    >
                      <div className="flex min-w-0 items-start gap-2">
                        <span
                          className={done ? "text-green-600" : "text-gray-400"}
                        >
                          {done ? "✓" : "○"}
                        </span>
                        <div className="min-w-0">
                          <div className="break-words text-gray-800 dark:text-gray-200">
                            {t.title}
                          </div>
                          <div className="text-xs text-gray-400">
                            Deadline: {formatFriendlyDate(t.due_date)}
                          </div>
                        </div>
                      </div>
                      <textarea
                        className="input min-h-16 w-full resize-y text-sm"
                        rows={2}
                        value={noteByTaskId[t.id] ?? ""}
                        maxLength={2000}
                        placeholder={
                          done
                            ? "Ghi chú thêm..."
                            : "Lý do chưa hoàn thành hoặc ghi chú..."
                        }
                        onChange={(event) => changeNote(t.id, event.target.value)}
                        onBlur={() => saveNote(t.id)}
                        aria-label={`Ghi chú cho ${t.title}`}
                      />
                    </li>
                    );
                  })}
                  {selected.todayTasks.length === 0 && (
                    <li className="text-gray-400">Không có việc nào.</li>
                  )}
                </ul>
              </>
            ) : (
              <ul className="space-y-2 text-sm">
                {selected.tomorrowNew.map((task) => (
                  <li
                    key={task.id}
                    className="rounded-md border border-gray-100 p-3 dark:border-gray-800"
                  >
                    <div className="break-words font-medium text-gray-800 dark:text-gray-200">
                      {task.title}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400">
                      <span>
                        {task.primary?.id === memberId ? "Phụ trách chính" : "Hỗ trợ"}
                      </span>
                      <span>Deadline: {formatFriendlyDate(task.due_date)}</span>
                    </div>
                  </li>
                ))}
                {selected.tomorrowNew.length === 0 && (
                  <li className="text-gray-400">Không có việc nào.</li>
                )}
              </ul>
            )}
          </div>

          <Modal
            open={myDayOpen}
            onClose={() => setMyDayOpen(false)}
            title={`My day · ${selected.memberName}`}
          >
            <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
              Chọn công việc đã thực hiện trong ngày. Báo cáo cũng tự động tính
              các công việc có deadline đúng ngày báo cáo.
            </p>
            <div className="relative mb-3">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m16 16 4 4" strokeLinecap="round" />
              </svg>
              <input
                type="search"
                className="input pl-9 pr-9"
                value={myDayQuery}
                onChange={(event) => setMyDayQuery(event.target.value)}
                placeholder="Tìm theo tên, mô tả hoặc nhãn..."
                aria-label="Tìm công việc trong My day"
                autoFocus
              />
              {myDayQuery && (
                <button
                  type="button"
                  onClick={() => setMyDayQuery("")}
                  className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                  aria-label="Xóa từ khóa tìm kiếm"
                >
                  ×
                </button>
              )}
            </div>
            <div className="mb-1 hidden grid-cols-[40px_minmax(0,1fr)_120px] gap-2 px-2 text-xs font-semibold uppercase tracking-wide text-gray-400 sm:grid">
              <span />
              <span>
                Công việc
                {myDayQuery && (
                  <span className="ml-1 font-normal normal-case">
                    ({filteredAssignedTasks.length}/{assignedTasks.length})
                  </span>
                )}
              </span>
              <span>Deadline</span>
            </div>
            <div className="max-h-[60vh] space-y-2 overflow-y-auto">
              {filteredAssignedTasks.map((task) => (
                <label
                  key={task.id}
                  className="grid cursor-pointer gap-2 rounded border border-gray-100 p-3 text-sm sm:grid-cols-[40px_minmax(0,1fr)_120px] sm:items-center dark:border-gray-800"
                >
                  <input
                    type="checkbox"
                    checked={loggedTaskIds.has(task.id)}
                    onChange={(event) => toggleLog(task.id, event.target.checked)}
                    className="h-5 w-5 accent-brand"
                  />
                  <span className="min-w-0 break-words">
                    <span className="font-medium">{task.title}</span>
                    <span className="ml-2 text-xs text-gray-400">
                      {task.primary?.id === memberId ? "Phụ trách chính" : "Hỗ trợ"}
                    </span>
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    <span className="sm:hidden">Deadline: </span>
                    {formatFriendlyDate(task.due_date)}
                  </span>
                </label>
              ))}
              {assignedTasks.length === 0 && (
                <p className="text-sm text-gray-400">Không có công việc được phân công.</p>
              )}
              {assignedTasks.length > 0 && filteredAssignedTasks.length === 0 && (
                <div className="rounded-lg border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-400 dark:border-gray-700">
                  Không tìm thấy công việc phù hợp.
                </div>
              )}
            </div>
          </Modal>
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
