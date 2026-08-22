import { MembersClient } from "@/components/admin/MembersClient";
import { listMembers } from "@/lib/data/members";
import { getCurrentProfile, listProfiles } from "@/lib/data/profiles";
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
  const isAdmin = me?.role === "admin";

  // Chỉ Quản trị mới liên kết tài khoản; nạp danh bạ tài khoản cho dropdown.
  const accounts = isAdmin
    ? (await listProfiles()).map((p) => ({
        id: p.id,
        label: p.full_name
          ? `${p.full_name}${p.email ? ` (${p.email})` : ""}`
          : p.email ?? p.id,
      }))
    : [];

  return (
    <MembersClient
      members={members}
      teamOptions={teamOptions}
      canEdit={canEdit}
      isAdmin={isAdmin}
      accounts={accounts}
    />
  );
}
