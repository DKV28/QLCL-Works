"use client";

import { useState } from "react";
import { TagsClient } from "./TagsClient";
import { UsersClient } from "./UsersClient";
import { RolePermissionsClient } from "./RolePermissionsClient";
import { WorkflowSettingsClient } from "./WorkflowSettingsClient";
import { WorkflowStepsSettingsClient } from "./WorkflowStepsSettingsClient";
import { TeamsClient } from "./TeamsClient";
import type {
  Profile,
  RolePermission,
  Tag,
  TaskStatusSetting,
  Team,
  WorkflowStepSetting,
} from "@/lib/types";

type SettingsTab =
  | "quy-trinh"
  | "buoc-quy-trinh"
  | "nhan"
  | "co-cau"
  | "nguoi-dung";

const TABS: [SettingsTab, string][] = [
  ["quy-trinh", "Trạng thái"],
  ["buoc-quy-trinh", "Các bước & SLA"],
  ["nhan", "Nhãn"],
  ["co-cau", "Cơ cấu team/tổ"],
  ["nguoi-dung", "Người dùng & phân quyền"],
];

export function SettingsClient({
  initialTab,
  statuses,
  workflowSteps,
  tags,
  teams,
  users,
  rolePermissions,
}: {
  initialTab: SettingsTab;
  statuses: TaskStatusSetting[];
  workflowSteps: WorkflowStepSetting[];
  tags: Tag[];
  teams: Team[];
  users: Profile[];
  rolePermissions: RolePermission[];
}) {
  const [tab, setTab] = useState<SettingsTab>(initialTab);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Cài đặt</h1>
          <p className="page-description">
            Quản lý quy trình, cơ cấu tổ chức và quyền truy cập hệ thống.
          </p>
        </div>
      </div>

      <div className="subnav mb-6" role="tablist" aria-label="Mục cài đặt">
        {TABS.map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={tab === value}
            onClick={() => setTab(value)}
            className={`subnav-item ${
              tab === value ? "subnav-item-active" : ""
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "quy-trinh" && (
        <WorkflowSettingsClient statuses={statuses} />
      )}
      {tab === "buoc-quy-trinh" && (
        <WorkflowStepsSettingsClient steps={workflowSteps} />
      )}
      {tab === "nhan" && <TagsClient tags={tags} />}
      {tab === "co-cau" && <TeamsClient teams={teams} />}
      {tab === "nguoi-dung" && (
        <>
          <UsersClient users={users} />
          <RolePermissionsClient permissions={rolePermissions} />
        </>
      )}
    </div>
  );
}
