"use server";

import { revalidatePath } from "next/cache";
import { createTag, deleteTag, listTags, updateTag } from "@/lib/data/tags";
import type { Tag } from "@/lib/types";

export type ActionResult = { ok: true } | { ok: false; error: string };

/** Danh sách nhãn — dùng cho form và bộ lọc (client tự nạp). */
export async function getTagsAction(): Promise<Tag[]> {
  return listTags();
}

function revalidate() {
  revalidatePath("/cong-viec");
  revalidatePath("/du-an", "layout");
  revalidatePath("/quan-tri/nhan");
}

export async function createTagAction(
  name: string,
  color: string,
): Promise<ActionResult> {
  const clean = name.trim();
  if (!clean) return { ok: false, error: "Tên nhãn không được để trống." };
  try {
    await createTag(clean, color);
  } catch (e) {
    return { ok: false, error: "Không tạo được nhãn." };
  }
  revalidate();
  return { ok: true };
}

export async function updateTagAction(
  id: string,
  name: string,
  color: string,
): Promise<ActionResult> {
  const clean = name.trim();
  if (!clean) return { ok: false, error: "Tên nhãn không được để trống." };
  try {
    await updateTag(id, { name: clean, color });
  } catch (e) {
    return { ok: false, error: "Không cập nhật được nhãn." };
  }
  revalidate();
  return { ok: true };
}

export async function deleteTagAction(id: string): Promise<ActionResult> {
  try {
    await deleteTag(id);
  } catch (e) {
    return { ok: false, error: "Không xóa được nhãn." };
  }
  revalidate();
  return { ok: true };
}
