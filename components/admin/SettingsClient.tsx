"use client";

import { useState } from "react";
import { TagsClient } from "./TagsClient";
import { UsersClient } from "./UsersClient";
import { RolePermissionsClient } from "./RolePermissionsClient";
import { WorkflowSettingsClient } from "./WorkflowSettingsClient";
import { TeamsClient } from "./TeamsClient";
import type {
  Profile,
  RolePermission,
  Tag,
  TaskPrioritySetting,
  TaskStatusSetting,
  Team,
} from "@/lib/types";

type SettingsTab = "quy-trinh" | "nhan" | "co-cau" | "nguoi-dung";

const TABS: [SettingsTab, string][] = [
  ["quy-trinh", "Quy trình công việc"],
  ["nhan", "Nhãn"],
  ["co-cau", "Cơ cấu team/tổ"],
  ["nguoi-dung", "Người dùng & phân quyền"],
];

export function SettingsClient({
  initialTab,
  priorities,
  statuses,
  tags,
  teams,
  users,
  rolePermissions,
}: {
  initialTab: SettingsTab;
  priorities: TaskPrioritySetting[];
  statuses: TaskStatusSetting[];
  tags: Tag[];
  teams: Team[];
  users: Profile[];
  rolePermissions: RolePermission[];
}) {
  const [tab, setTab] = useState<SettingsTab>(initialTab);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Cài đặt</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Khu vực dành riêng cho Quản trị viên.
        </p>
      </div>

      <div className="mb-6 flex flex-wrap gap-2 border-b border-gray-200 pb-3 dark:border-gray-800">
        {TABS.map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className={`rounded-md px-3 py-2 text-sm font-medium ${
              tab === value
                ? "bg-brand text-white"
                : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "quy-trinh" && (
        <WorkflowSettingsClient priorities={priorities} statuses={statuses} />
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
