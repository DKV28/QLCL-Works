"use client";

import { useMemo, useState } from "react";
import { StatCard } from "./StatCard";
import { Donut } from "./Donut";
import { BarList } from "./BarList";
import {
  completionByMember,
  completionByProject,
  completionByTeam,
  onTimeStats,
  summarize,
} from "@/lib/logic/stats";
import type { MemberLite, Project, TaskWithAssignees } from "@/lib/types";

export function DashboardClient({
  tasks,
  members,
  projects,
}: {
  tasks: TaskWithAssignees[];
  members: MemberLite[];
  projects: Pick<Project, "id" | "name">[];
}) {
  const [projectId, setProjectId] = useState("");
  const [teamId, setTeamId] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // Team duy nhất từ nhân sự
  const teamOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const m of members) {
      if (m.team_id && m.team_name) map.set(m.team_id, m.team_name);
    }
    return Array.from(map.entries()).sort((a, b) =>
      a[1].localeCompare(b[1], "vi"),
    );
  }, [members]);

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      if (projectId && t.project_id !== projectId) return false;
      if (teamId) {
        const people = t.primary ? [t.primary, ...t.supporters] : t.supporters;
        if (!people.some((p) => p.team_id === teamId)) return false;
      }
      if (fromDate && (!t.due_date || t.due_date < fromDate)) return false;
      if (toDate && (!t.due_date || t.due_date > toDate)) return false;
      return true;
    });
  }, [tasks, projectId, teamId, fromDate, toDate]);

  const s = useMemo(() => summarize(filtered), [filtered]);
  const projectName = (id: string) =>
    projects.find((p) => p.id === id)?.name;
  const byProject = useMemo(
    () => completionByProject(filtered, projectName),
    [filtered],
  );
  const byMember = useMemo(() => completionByMember(filtered), [filtered]);
  const byTeam = useMemo(() => completionByTeam(filtered), [filtered]);
  const ot = useMemo(() => onTimeStats(filtered), [filtered]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Báo cáo</h1>
        <button className="btn-secondary no-print" onClick={() => window.print()}>
          Xuất PDF
        </button>
      </div>

      {/* Bộ lọc */}
      <div className="card no-print mb-6 p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="label">Dự án</label>
            <select
              className="input"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
            >
              <option value="">Tất cả</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
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
          <div>
            <label className="label">Deadline từ</label>
            <input
              type="date"
              className="input"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Deadline đến</label>
            <input
              type="date"
              className="input"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* KPI */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Tổng công việc" value={s.total} />
        <StatCard
          label="Hoàn thành"
          value={`${Math.round(s.completionRate * 100)}%`}
          sub={`${s.done}/${s.total} việc`}
          tone="green"
        />
        <StatCard label="Quá hạn" value={s.overdue} tone="red" />
        <StatCard label="Cần bắt đầu" value={s.needStart} tone="orange" />
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="mb-4 text-sm font-semibold">Phân bố trạng thái</h2>
          <Donut
            segments={[
              { label: "Chưa bắt đầu", value: s.notStarted, color: "#9ca3af" },
              { label: "Đang làm", value: s.inProgress, color: "#3b82f6" },
              { label: "Hoàn thành", value: s.done, color: "#22c55e" },
            ]}
          />
        </div>
        <div className="card p-5">
          <h2 className="mb-4 text-sm font-semibold">
            Đúng hạn vs Trễ (việc đã hoàn thành)
          </h2>
          <Donut
            segments={[
              { label: "Đúng hạn", value: ot.onTime, color: "#22c55e" },
              { label: "Trễ", value: ot.late, color: "#ef4444" },
            ]}
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card p-5">
          <h2 className="mb-4 text-sm font-semibold">Theo dự án</h2>
          <BarList items={byProject} />
        </div>
        <div className="card p-5">
          <h2 className="mb-4 text-sm font-semibold">Theo người phụ trách</h2>
          <BarList items={byMember} />
        </div>
        <div className="card p-5">
          <h2 className="mb-4 text-sm font-semibold">Theo team</h2>
          <BarList items={byTeam} />
        </div>
      </div>
    </div>
  );
}
