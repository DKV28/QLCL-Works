"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/data/profiles";
import {
  updateTaskPrioritySetting,
  updateTaskStatusSetting,
} from "@/lib/data/settings";
import type { TaskPriority, TaskStatus } from "@/lib/types";

export type ActionResult = { ok: true } | { ok: false; error: string };

async function requireAdmin(): Promise<ActionResult> {
  const me = await getCurrentProfile();
  if (!me || me.role !== "admin") {
    return { ok: false, error: "Chỉ Quản trị viên được thay đổi cài đặt." };
  }
  return { ok: true };
}

function parse(formData: FormData) {
  const label = String(formData.get("label") ?? "").trim();
  const color = String(formData.get("color") ?? "").trim();
  const sortOrder = Number(formData.get("sort_order") ?? 0);
  const isDefault = formData.get("is_default") === "on";
  return {
    label,
    color,
    sort_order: Number.isFinite(sortOrder) ? sortOrder : 0,
    is_active: isDefault || formData.get("is_active") === "on",
    is_default: isDefault,
  };
}

function revalidate() {
  revalidatePath("/cai-dat");
  revalidatePath("/cong-viec");
  revalidatePath("/du-an", "layout");
}

export async function updatePrioritySettingAction(
  code: TaskPriority,
  formData: FormData,
): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard;
  const input = parse(formData);
  if (!input.label) return { ok: false, error: "Tên hiển thị không được trống." };
  if (!/^#[0-9a-f]{6}$/i.test(input.color)) {
    return { ok: false, error: "Màu phải có định dạng #RRGGBB." };
  }
  try {
    await updateTaskPrioritySetting(code, input);
    revalidate();
    return { ok: true };
  } catch {
    return { ok: false, error: "Không cập nhật được mức độ quan trọng." };
  }
}

export async function updateStatusSettingAction(
  code: TaskStatus,
  formData: FormData,
): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard;
  const input = parse(formData);
  if (!input.label) return { ok: false, error: "Tên hiển thị không được trống." };
  if (!/^#[0-9a-f]{6}$/i.test(input.color)) {
    return { ok: false, error: "Màu phải có định dạng #RRGGBB." };
  }
  try {
    await updateTaskStatusSetting(code, input);
    revalidate();
    return { ok: true };
  } catch {
    return { ok: false, error: "Không cập nhật được trạng thái." };
  }
}
