import { MembersClient } from "@/components/admin/MembersClient";
import { listMembers } from "@/lib/data/members";
import { listTeams, teamDisplayName } from "@/lib/data/teams";

export const dynamic = "force-dynamic";

export default async function MembersPage() {
  const [members, teams] = await Promise.all([listMembers(), listTeams()]);

  const teamOptions = teams
    .map((t) => ({ id: t.id, name: teamDisplayName(t.id, teams) ?? t.name }))
    .sort((a, b) => a.name.localeCompare(b.name, "vi"));

  return <MembersClient members={members} teamOptions={teamOptions} />;
}
