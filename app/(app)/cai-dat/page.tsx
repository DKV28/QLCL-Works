import { redirect } from "next/navigation";
import { SettingsClient } from "@/components/admin/SettingsClient";
import { getCurrentProfile, listProfiles } from "@/lib/data/profiles";
import {
  listTaskPrioritySettings,
  listTaskStatusSettings,
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

  const [priorities, statuses, tags, teams, users] = await Promise.all([
    listTaskPrioritySettings(),
    listTaskStatusSettings(),
    listTags(),
    listTeams(),
    listProfiles(),
  ]);

  const requested = searchParams?.tab;
  const initialTab =
    requested === "nhan" || requested === "co-cau" || requested === "nguoi-dung"
      ? requested
      : "quy-trinh";

  return (
    <SettingsClient
      initialTab={initialTab}
      priorities={priorities}
      statuses={statuses}
      tags={tags}
      teams={teams}
      users={users}
    />
  );
}
