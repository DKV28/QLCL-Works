"use server";

import { revalidatePath } from "next/cache";
import {
  createProject,
  duplicateProject,
  softDeleteProject,
  updateProject,
} from "@/lib/data/projects";
import { getCurrentProfile } from "@/lib/data/profiles";
import { canWriteProject } from "@/lib/data/permissions";
import { recordActivity } from "@/lib/data/activity";
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
      is_template: formData.get("is_template") === "on",
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
  if (!(await canWriteProject(id)))
    return { ok: false, error: "Bạn chỉ sửa được dự án do mình tạo." };

  try {
    await updateProject(id, {
      name,
      description: String(formData.get("description") ?? "").trim() || null,
      status: (formData.get("status") as ProjectStatus) || "dang_thuc_hien",
      is_template: formData.get("is_template") === "on",
    });
  } catch (e) {
    return { ok: false, error: "Không cập nhật được dự án." };
  }

  revalidatePath("/du-an");
  revalidatePath(`/du-an/${id}`);
  return { ok: true };
}

export async function duplicateProjectAction(
  id: string,
): Promise<ActionResult> {
  try {
    const created = await duplicateProject(id);
    await recordActivity({
      project_id: created.id,
      action: "nhan_ban_du_an",
      detail: created.name,
    });
  } catch (e) {
    return { ok: false, error: "Không nhân bản được dự án." };
  }
  revalidatePath("/du-an");
  revalidatePath("/cong-viec");
  return { ok: true };
}

/** Tạo dự án vận hành mới từ một dự án mẫu (nhân bản). */
export async function createFromTemplateAction(
  templateId: string,
): Promise<ActionResult> {
  try {
    const created = await duplicateProject(templateId);
    // Bản tạo ra là dự án vận hành, không phải mẫu.
    await updateProject(created.id, { is_template: false });
    await recordActivity({
      project_id: created.id,
      action: "tao_tu_mau",
      detail: created.name,
    });
  } catch (e) {
    return { ok: false, error: "Không tạo được dự án từ mẫu." };
  }
  revalidatePath("/du-an");
  revalidatePath("/cong-viec");
  return { ok: true };
}

export async function deleteProjectAction(id: string): Promise<ActionResult> {
  if (!(await canWriteProject(id)))
    return { ok: false, error: "Bạn chỉ xóa được dự án do mình tạo." };
  try {
    await softDeleteProject(id);
  } catch (e) {
    return { ok: false, error: "Không xóa được dự án." };
  }
  revalidatePath("/du-an");
  return { ok: true };
}
