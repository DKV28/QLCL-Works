// Data access: members (Nhân sự). Chỉ chứa query Supabase, không JSX.
import { createClient } from "@/lib/supabase/server";
import type { Member, MemberLite } from "@/lib/types";
import { listTeams, teamDisplayName } from "./teams";

/** Toàn bộ nhân sự (kèm cờ hoạt động) — dùng cho trang quản lý Nhân sự. */
export async function listMembers(): Promise<Member[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("members")
    .select("*")
    .order("full_name", { ascending: true });

  if (error) throw error;
  return (data as Member[]) ?? [];
}

/**
 * Nhân sự đang hoạt động, kèm tên team đã tính đường dẫn — dùng để chọn
 * người phụ trách. Sắp theo team rồi tới tên.
 */
export async function listActiveMemberLites(): Promise<MemberLite[]> {
  const [members, teams] = await Promise.all([listMembers(), listTeams()]);

  return members
    .filter((m) => m.is_active)
    .map((m) => ({
      id: m.id,
      full_name: m.full_name,
      team_id: m.team_id,
      team_name: teamDisplayName(m.team_id, teams),
    }))
    .sort((a, b) => {
      const ta = a.team_name ?? "zzz";
      const tb = b.team_name ?? "zzz";
      if (ta !== tb) return ta.localeCompare(tb, "vi");
      return a.full_name.localeCompare(b.full_name, "vi");
    });
}

export interface MemberInput {
  full_name: string;
  team_id?: string | null;
  note?: string | null;
  is_active?: boolean;
}

export async function createMember(input: MemberInput): Promise<Member> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("members")
    .insert(input)
    .select("*")
    .single();

  if (error) throw error;
  return data as Member;
}

export async function updateMember(
  id: string,
  input: Partial<MemberInput>,
): Promise<Member> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("members")
    .update(input)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return data as Member;
}

export async function setMemberActive(
  id: string,
  isActive: boolean,
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("members")
    .update({ is_active: isActive })
    .eq("id", id);

  if (error) throw error;
}
