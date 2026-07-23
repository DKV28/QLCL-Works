"use server";

import { revalidatePath } from "next/cache";
import {
  createMember,
  setMemberActive,
  updateMember,
} from "@/lib/data/members";

export type ActionResult = { ok: true } | { ok: false; error: string };

function revalidate() {
  revalidatePath("/quan-tri/nhan-su");
  revalidatePath("/cong-viec");
  revalidatePath("/du-an", "layout");
}

function parse(formData: FormData) {
  return {
    full_name: String(formData.get("full_name") ?? "").trim(),
    team_id: String(formData.get("team_id") ?? "") || null,
    note: String(formData.get("note") ?? "").trim() || null,
  };
}

export async function createMemberAction(
  formData: FormData,
): Promise<ActionResult> {
  const fields = parse(formData);
  if (!fields.full_name)
    return { ok: false, error: "Họ tên không được để trống." };

  try {
    await createMember(fields);
  } catch (e) {
    return { ok: false, error: "Không thêm được nhân sự." };
  }
  revalidate();
  return { ok: true };
}

export async function updateMemberAction(
  id: string,
  formData: FormData,
): Promise<ActionResult> {
  const fields = parse(formData);
  if (!fields.full_name)
    return { ok: false, error: "Họ tên không được để trống." };

  try {
    await updateMember(id, fields);
  } catch (e) {
    return { ok: false, error: "Không cập nhật được nhân sự." };
  }
  revalidate();
  return { ok: true };
}

export async function toggleMemberActiveAction(
  id: string,
  isActive: boolean,
): Promise<ActionResult> {
  try {
    await setMemberActive(id, isActive);
  } catch (e) {
    return { ok: false, error: "Không cập nhật được trạng thái nhân sự." };
  }
  revalidate();
  return { ok: true };
}
