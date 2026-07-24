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
}: {
  tasks: TaskWithAssignees[];
  members: MemberLite[];
  projects: Pick<Project, "id" | "name">[];
}) {
  const [tab, setTab] = useState<Tab>("overview");

  return (
    <div>
      <div className="no-print mb-6 inline-flex rounded-md border border-gray-300 p-0.5 dark:border-gray-700">
        {TABS.map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`rounded px-3 py-1 text-sm font-medium transition-colors ${
              tab === id
                ? "bg-brand text-white"
                : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
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
      {tab === "weekly" && <WeeklyReport tasks={tasks} members={members} />}
    </div>
  );
}
