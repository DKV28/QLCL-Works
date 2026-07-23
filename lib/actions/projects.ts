"use server";

import { revalidatePath } from "next/cache";
import {
  createProject,
  softDeleteProject,
  updateProject,
} from "@/lib/data/projects";
import { getCurrentProfile } from "@/lib/data/profiles";
import type { ProjectStatus } from "@/lib/types";

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function createProjectAction(
  formData: FormData,
): Promise<ActionResult> {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { ok: false, error: "Tên dự án không được để trống." };

  const profile = await getCurrentProfile();

  try {
    await createProject({
      name,
      description: String(formData.get("description") ?? "").trim() || null,
      status: (formData.get("status") as ProjectStatus) || "dang_thuc_hien",
      owner_id: profile?.id ?? null,
    });
  } catch (e) {
    return { ok: false, error: "Không tạo được dự án. Vui lòng thử lại." };
  }

  revalidatePath("/du-an");
  return { ok: true };
}

export async function updateProjectAction(
  id: string,
  formData: FormData,
): Promise<ActionResult> {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { ok: false, error: "Tên dự án không được để trống." };

  try {
    await updateProject(id, {
      name,
      description: String(formData.get("description") ?? "").trim() || null,
      status: (formData.get("status") as ProjectStatus) || "dang_thuc_hien",
    });
  } catch (e) {
    return { ok: false, error: "Không cập nhật được dự án." };
  }

  revalidatePath("/du-an");
  revalidatePath(`/du-an/${id}`);
  return { ok: true };
}

export async function deleteProjectAction(id: string): Promise<ActionResult> {
  try {
    await softDeleteProject(id);
  } catch (e) {
    return { ok: false, error: "Không xóa được dự án." };
  }
  revalidatePath("/du-an");
  return { ok: true };
}
