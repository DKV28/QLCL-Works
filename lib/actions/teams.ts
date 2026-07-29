"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/data/profiles";
import {
  createTeam,
  deleteTeam,
  listTeams,
  teamUsage,
  updateTeam,
} from "@/lib/data/teams";

export type ActionResult = { ok: true } | { ok: false; error: string };

async function requireAdmin(): Promise<ActionResult> {
  const me = await getCurrentProfile();
  if (!me || me.role !== "admin") {
    return { ok: false, error: "Chỉ Quản trị viên được thay đổi cơ cấu team." };
  }
  return { ok: true };
}

function parse(formData: FormData) {
  return {
    name: String(formData.get("name") ?? "").trim(),
    parent_id: String(formData.get("parent_id") ?? "") || null,
  };
}

function revalidate() {
  revalidatePath("/cai-dat");
  revalidatePath("/quan-tri/nhan-su");
  revalidatePath("/cong-viec");
  revalidatePath("/du-an", "layout");
}

export async function createTeamAction(
  formData: FormData,
): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard;
  const input = parse(formData);
  if (!input.name) return { ok: false, error: "Tên team không được để trống." };
  try {
    await createTeam(input);
    revalidate();
    return { ok: true };
  } catch {
    return { ok: false, error: "Không tạo được team/tổ." };
  }
}

export async function updateTeamAction(
  id: string,
  formData: FormData,
): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard;
  const input = parse(formData);
  if (!input.name) return { ok: false, error: "Tên team không được để trống." };
  if (input.parent_id === id) {
    return { ok: false, error: "Một team không thể trực thuộc chính nó." };
  }
  try {
    if (input.parent_id) {
      const teams = await listTeams();
      const byId = new Map(teams.map((team) => [team.id, team]));
      let cursor: string | null = input.parent_id;
      while (cursor) {
        if (cursor === id) {
          return { ok: false, error: "Quan hệ trực thuộc sẽ tạo thành vòng lặp." };
        }
        cursor = byId.get(cursor)?.parent_id ?? null;
      }
    }
    await updateTeam(id, input);
    revalidate();
    return { ok: true };
  } catch {
    return { ok: false, error: "Không cập nhật được team/tổ." };
  }
}

export async function deleteTeamAction(id: string): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard;
  try {
    const usage = await teamUsage(id);
    if (usage.memberCount || usage.childCount) {
      return {
        ok: false,
        error: `Không thể xóa: team đang có ${usage.memberCount} nhân sự và ${usage.childCount} team con.`,
      };
    }
    await deleteTeam(id);
    revalidate();
    return { ok: true };
  } catch {
    return { ok: false, error: "Không xóa được team/tổ." };
  }
}
