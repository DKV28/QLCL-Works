"use client";

import { useMemo, useState } from "react";
import { StatCard } from "./StatCard";
import {
  weeklyReport,
  weeklyReportText,
  weekStartOf,
} from "@/lib/logic/reports";
import { todayISO } from "@/lib/logic/overdue";
import { formatDMY, formatFriendlyDate } from "@/lib/logic/dates";
import type { MemberLite, TaskWithAssignees } from "@/lib/types";

function addDays(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

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

function TaskLines({ tasks }: { tasks: TaskWithAssignees[] }) {
  if (tasks.length === 0) {
    return <li className="py-2.5 text-gray-400">Không có.</li>;
  }
  return (
    <>
      {tasks.map((t) => (
        <li
          key={t.id}
          className="flex items-start justify-between gap-3 py-2.5 text-gray-800 dark:text-gray-200"
        >
          <span>
            {t.title}
            {t.is_arising && (
              <span className="text-xs text-orange-500"> (phát sinh)</span>
            )}
          </span>
          <span className="shrink-0 text-xs text-gray-400">
            {t.due_date ? formatFriendlyDate(t.due_date) : ""}
          </span>
        </li>
      ))}
    </>
  );
}

export function WeeklyReport({
  tasks,
  members,
}: {
  tasks: TaskWithAssignees[];
  members: MemberLite[];
}) {
  const [teamId, setTeamId] = useState("");
  const [weekStart, setWeekStart] = useState(weekStartOf(todayISO()));

  const teamOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const m of members) {
      if (m.team_id && m.team_name) map.set(m.team_id, m.team_name);
    }
    return Array.from(map.entries()).sort((a, b) =>
      a[1].localeCompare(b[1], "vi"),
    );
  }, [members]);

  const r = useMemo(
    () => weeklyReport(tasks, weekStart, teamId || undefined),
    [tasks, weekStart, teamId],
  );

  return (
    <div>
      <div className="card no-print mb-6 p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-48 flex-1 sm:flex-none">
            <label className="label">Team</label>
            <select
              className="input"
              value={teamId}
              onChange={(e) => setTeamId(e.target.value)}
            >
              <option value="">Tất cả</option>
              {teamOptions.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-1 flex-wrap items-center gap-2 sm:justify-end">
            <button
              className="btn-secondary text-sm"
              onClick={() => setWeekStart(addDays(weekStart, -7))}
            >
              ← Kỳ trước
            </button>
            <span className="min-w-40 flex-1 text-center text-sm font-semibold text-gray-700 dark:text-gray-200 sm:flex-none">
              {formatFriendlyDate(r.weekStart)} – {formatFriendlyDate(r.weekEnd)}
            </span>
            <button
              className="btn-secondary text-sm"
              onClick={() => setWeekStart(addDays(weekStart, 7))}
            >
              Kỳ sau →
            </button>
          </div>
        </div>
        <p className="mt-3 border-t border-gray-100 pt-3 text-xs text-gray-500 dark:border-gray-800 dark:text-gray-400">
          Tuần chạy Thứ Bảy → Thứ Sáu. A/B/C tính theo task có deadline trong tuần;
          D là task chưa hoàn thành có deadline đến hết Thứ Sáu tuần kế.
        </p>
      </div>

      <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="A · Có deadline trong tuần"
          value={r.a}
          tone="blue"
          sub={`Phát sinh: ${r.arisingCount} (${Math.round(r.arisingPct * 100)}%)`}
        />
        <StatCard label="B · Đã hoàn thành" value={r.b} tone="green" />
        <StatCard label="C · Chưa hoàn thành" value={r.c} tone="red" />
        <StatCard
          label="D · Kế hoạch tuần kế"
          value={r.d}
          tone="orange"
          sub={`Đến T6 ${formatDMY(r.nextWeekEnd)}`}
        />
      </div>

      <div className="card mb-4 p-4">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Nội dung báo cáo</h3>
          <CopyButton text={weeklyReportText(r)} />
        </div>
        <pre className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">
          {weeklyReportText(r)}
        </pre>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-4">
          <h3 className="mb-2 text-sm font-semibold">
            C · Chưa hoàn thành trong tuần ({r.c})
          </h3>
          <ul className="divide-y divide-gray-100 text-sm dark:divide-gray-800">
            <TaskLines tasks={r.cTasks} />
          </ul>
        </div>
        <div className="card p-4">
          <h3 className="mb-2 text-sm font-semibold">
            D · Kế hoạch tuần kế ({r.d})
          </h3>
          <ul className="divide-y divide-gray-100 text-sm dark:divide-gray-800">
            <TaskLines tasks={r.dTasks} />
          </ul>
        </div>
      </div>
    </div>
  );
}
