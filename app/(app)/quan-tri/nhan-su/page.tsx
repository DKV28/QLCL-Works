import { MembersClient } from "@/components/admin/MembersClient";
import { listMembers } from "@/lib/data/members";
import { getCurrentProfile } from "@/lib/data/profiles";
import { listTeams, teamDisplayName } from "@/lib/data/teams";

export const dynamic = "force-dynamic";

export default async function MembersPage() {
  const [members, teams, me] = await Promise.all([
    listMembers(),
    listTeams(),
    getCurrentProfile(),
  ]);

  const teamOptions = teams
    .map((t) => ({ id: t.id, name: teamDisplayName(t.id, teams) ?? t.name }))
    .sort((a, b) => a.name.localeCompare(b.name, "vi"));

  const canEdit = me?.role === "admin" || me?.role === "manager";

  return (
    <MembersClient
      members={members}
      teamOptions={teamOptions}
      canEdit={canEdit}
    />
  );
}
