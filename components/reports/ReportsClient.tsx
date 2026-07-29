"use client";

import { useState } from "react";
import { DashboardClient } from "./DashboardClient";
import { DailyReport } from "./DailyReport";
import { WeeklyReport } from "./WeeklyReport";
import type { MemberLite, Project, TaskWithAssignees } from "@/lib/types";

type Tab = "overview" | "daily" | "weekly";

const TABS: [Tab, string][] = [
  ["overview", "Tổng quan"],
  ["daily", "Báo cáo ngày"],
  ["weekly", "Báo cáo tuần"],
];

export function ReportsClient({
  tasks,
  members,
  projects,
  canViewWeekly,
}: {
  tasks: TaskWithAssignees[];
  members: MemberLite[];
  projects: Pick<Project, "id" | "name">[];
  canViewWeekly: boolean;
}) {
  const [tab, setTab] = useState<Tab>("overview");
  const tabs = canViewWeekly
    ? TABS
    : TABS.filter(([id]) => id !== "weekly");

  return (
    <div>
      <div className="segmented no-print mb-6" role="tablist" aria-label="Loại báo cáo">
        {tabs.map(([id, label]) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`segmented-item ${
              tab === id
                ? "segmented-item-active"
                : ""
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <DashboardClient tasks={tasks} members={members} projects={projects} />
      )}
      {tab === "daily" && <DailyReport tasks={tasks} members={members} />}
      {canViewWeekly && tab === "weekly" && (
        <WeeklyReport tasks={tasks} members={members} />
      )}
    </div>
  );
}
