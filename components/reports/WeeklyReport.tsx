"use client";

import { useMemo, useState } from "react";
import { StatCard } from "./StatCard";
import {
  weeklyReport,
  weeklyReportText,
  weekStartOf,
} from "@/lib/logic/reports";
import { todayISO } from "@/lib/logic/overdue";
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
      <div className="card no-print mb-6 flex flex-wrap items-end gap-4 p-4">
        <div>
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
        <div className="flex items-center gap-2">
          <button
            className="btn-secondary text-sm"
            onClick={() => setWeekStart(addDays(weekStart, -7))}
          >
            ← Tuần trước
          </button>
          <span className="text-sm text-gray-600 dark:text-gray-300">
            {r.weekStart} → {r.weekEnd}
          </span>
          <button
            className="btn-secondary text-sm"
            onClick={() => setWeekStart(addDays(weekStart, 7))}
          >
            Tuần sau →
          </button>
        </div>
      </div>

      <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Hoạch định" value={r.planned.length} tone="blue" />
        <StatCard label="Phát sinh" value={r.arising.length} tone="orange" />
        <StatCard label="Hoàn thành" value={r.done} tone="green" />
        <StatCard label="Chưa hoàn thành" value={r.notDone} tone="red" />
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
            Hoạch định ({r.planned.length})
          </h3>
          <ul className="space-y-1 text-sm">
            {r.planned.map((t) => (
              <li key={t.id} className="text-gray-800 dark:text-gray-200">
                {t.title}
              </li>
            ))}
            {r.planned.length === 0 && (
              <li className="text-gray-400">Không có.</li>
            )}
          </ul>
        </div>
        <div className="card p-4">
          <h3 className="mb-2 text-sm font-semibold">
            Phát sinh ({r.arising.length})
          </h3>
          <ul className="space-y-1 text-sm">
            {r.arising.map((t) => (
              <li key={t.id} className="text-gray-800 dark:text-gray-200">
                {t.title}
              </li>
            ))}
            {r.arising.length === 0 && (
              <li className="text-gray-400">Không có.</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
