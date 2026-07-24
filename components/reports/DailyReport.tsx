"use client";

import { useMemo, useState } from "react";
import { StatCard } from "./StatCard";
import {
  dailyReportFor,
  dailyReportText,
  type DailyReport as DR,
} from "@/lib/logic/reports";
import type { MemberLite, TaskWithAssignees } from "@/lib/types";

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

  const allReports = useMemo(
    () => members.map((m) => dailyReportFor(tasks, m)),
    [tasks, members],
  );
  const selected: DR | null = memberId
    ? (allReports.find((r) => r.memberId === memberId) ?? null)
    : null;

  return (
    <div>
      <div className="card no-print mb-6 p-4">
        <label className="label">Nhân viên</label>
        <select
          className="input max-w-xs"
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
                      t.status === "hoan_thanh" || t.completed_at
                        ? "text-green-600"
                        : "text-gray-400"
                    }
                  >
                    {t.status === "hoan_thanh" || t.completed_at ? "✓" : "○"}
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
