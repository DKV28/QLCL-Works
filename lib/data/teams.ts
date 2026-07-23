// Data access: teams (có phân cấp parent_id). Chỉ chứa query Supabase.
import { createClient } from "@/lib/supabase/server";
import type { Team } from "@/lib/types";

export async function listTeams(): Promise<Team[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("teams")
    .select("*")
    .order("name", { ascending: true });

  if (error) throw error;
  return (data as Team[]) ?? [];
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
