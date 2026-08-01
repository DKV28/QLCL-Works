// Data access: teams (có phân cấp parent_id). Chỉ chứa query Supabase.
import { createClient } from "@/lib/supabase/server";
import type { Team } from "@/lib/types";
import { getCurrentProfile } from "./profiles";

export async function listTeams(): Promise<Team[]> {
  const supabase = createClient();
  const [me, result] = await Promise.all([
    getCurrentProfile(),
    supabase.from("teams").select("*").order("name", { ascending: true }),
  ]);

  if (result.error) throw result.error;
  const teams = (result.data as Team[]) ?? [];
  if (me?.role === "admin" || me?.role === "manager") return teams;
  if (!me?.team_id) return [];
  return teams.filter((team) => team.id === me.team_id);
}

export async function createTeam(input: {
  name: string;
  parent_id: string | null;
}): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("teams").insert(input);
  if (error) throw error;
}

export async function updateTeam(
  id: string,
  input: { name: string; parent_id: string | null },
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("teams").update(input).eq("id", id);
  if (error) throw error;
}

export async function teamUsage(id: string): Promise<{
  memberCount: number;
  childCount: number;
}> {
  const supabase = createClient();
  const [members, children] = await Promise.all([
    supabase
      .from("members")
      .select("id", { count: "exact", head: true })
      .eq("team_id", id),
    supabase
      .from("teams")
      .select("id", { count: "exact", head: true })
      .eq("parent_id", id),
  ]);
  if (members.error) throw members.error;
  if (children.error) throw children.error;
  return {
    memberCount: members.count ?? 0,
    childCount: children.count ?? 0,
  };
}

export async function deleteTeam(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("teams").delete().eq("id", id);
  if (error) throw error;
}

/**
 * Đường dẫn hiển thị của team: "Tân Bình / Ngoại trú" (nếu là tổ con) hoặc
 * "Quận 7" (nếu là team cấp trên). Bỏ tiền tố "Team " cho gọn.
 */
export function teamDisplayName(
  teamId: string | null,
  teams: Team[],
): string | null {
  if (!teamId) return null;
  const byId = new Map(teams.map((t) => [t.id, t]));
  const team = byId.get(teamId);
  if (!team) return null;

  const clean = (s: string) => s.replace(/^Team\s+/i, "");
  if (team.parent_id) {
    const parent = byId.get(team.parent_id);
    return parent ? `${clean(parent.name)} / ${clean(team.name)}` : clean(team.name);
  }
  return clean(team.name);
}
