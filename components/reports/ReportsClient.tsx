"use client";

import { useState } from "react";
import { DashboardClient } from "./DashboardClient";
import { DailyReport } from "./DailyReport";
import { WeeklyReport } from "./WeeklyReport";
import type {
  EditScope,
  MemberLite,
  Project,
  TaskWithAssignees,
} from "@/lib/types";

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
  scope,
  myMemberId,
}: {
  tasks: TaskWithAssignees[];
  members: MemberLite[];
  projects: Pick<Project, "id" | "name">[];
  scope: EditScope; // all = đầy đủ, own = chỉ cá nhân
  myMemberId: string | null;
}) {
  const personal = scope === "own";
  // Cá nhân: chỉ báo cáo ngày & tuần của mình (ẩn Tổng quan toàn phòng).
  const availableTabs: [Tab, string][] = personal
    ? TABS.filter(([id]) => id !== "overview")
    : TABS;
  const [tab, setTab] = useState<Tab>(personal ? "daily" : "overview");
  const tabs = availableTabs;

  // Cá nhân nhưng tài khoản chưa được liên kết nhân sự -> không biết "của mình".
  if (personal && !myMemberId) {
    return (
      <div>
        <div className="page-header">
          <h1 className="page-title">Báo cáo</h1>
        </div>
        <div className="card p-6 text-sm text-gray-600 dark:text-gray-300">
          Tài khoản của bạn chưa được liên kết với hồ sơ nhân sự nên chưa thể xem
          báo cáo cá nhân. Vui lòng liên hệ Quản trị viên để liên kết trong trang
          Nhân sự.
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Báo cáo</h1>
          <p className="page-description">
            Tổng hợp tiến độ, hiệu suất và các công việc cần chú ý.
          </p>
        </div>
        <button
          className="btn-secondary no-print"
          onClick={() => window.print()}
        >
          Xuất PDF
        </button>
      </div>
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

      {!personal && tab === "overview" && (
        <DashboardClient tasks={tasks} members={members} projects={projects} />
      )}
      {tab === "daily" && (
        <DailyReport
          tasks={tasks}
          members={members}
          lockMemberId={personal ? myMemberId ?? undefined : undefined}
          defaultMemberId={!personal ? myMemberId ?? undefined : undefined}
        />
      )}
      {tab === "weekly" && (
        <WeeklyReport
          tasks={tasks}
          members={members}
          lockMemberId={personal ? myMemberId ?? undefined : undefined}
        />
      )}
    </div>
  );
}
