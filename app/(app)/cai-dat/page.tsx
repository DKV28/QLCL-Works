import { redirect } from "next/navigation";
import { SettingsClient } from "@/components/admin/SettingsClient";
import { getCurrentProfile, listProfiles } from "@/lib/data/profiles";
import { listRolePermissions } from "@/lib/data/permissions";
import {
  listTaskStatusSettings,
  listWorkflowStepSettings,
} from "@/lib/data/settings";
import { listTags } from "@/lib/data/tags";
import { listTeams } from "@/lib/data/teams";

export const dynamic = "force-dynamic";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams?: { tab?: string };
}) {
  const me = await getCurrentProfile();
  if (!me || me.role !== "admin") redirect("/cong-viec");

  const [statuses, workflowSteps, tags, teams, users, rolePermissions] =
    await Promise.all([
      listTaskStatusSettings(),
      listWorkflowStepSettings(),
      listTags(),
      listTeams(),
      listProfiles(),
      listRolePermissions(),
    ]);

  const requested = searchParams?.tab;
  const initialTab =
    requested === "buoc-quy-trinh" ||
    requested === "nhan" ||
    requested === "co-cau" ||
    requested === "nguoi-dung"
      ? requested
      : "quy-trinh";

  return (
    <SettingsClient
      initialTab={initialTab}
      statuses={statuses}
      workflowSteps={workflowSteps}
      tags={tags}
      teams={teams}
      users={users}
      rolePermissions={rolePermissions}
    />
  );
}
