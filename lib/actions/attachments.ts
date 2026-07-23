"use server";

import { revalidatePath } from "next/cache";
import {
  createAttachment,
  deleteAttachment,
  type AttachmentInput,
} from "@/lib/data/attachments";

export type ActionResult = { ok: true } | { ok: false; error: string };

function revalidate() {
  revalidatePath("/cong-viec");
  revalidatePath("/du-an", "layout");
}

/** Ghi metadata sau khi client đã upload tệp lên Storage. */
export async function createAttachmentAction(
  input: AttachmentInput,
): Promise<ActionResult> {
  if (!input.file_name || !input.storage_path) {
    return { ok: false, error: "Thiếu thông tin tệp." };
  }
  try {
    await createAttachment(input);
  } catch (e) {
    return { ok: false, error: "Không lưu được tệp đính kèm." };
  }
  revalidate();
  return { ok: true };
}

export async function deleteAttachmentAction(
  id: string,
): Promise<ActionResult> {
  try {
    await deleteAttachment(id);
  } catch (e) {
    return { ok: false, error: "Không xóa được tệp." };
  }
  revalidate();
  return { ok: true };
}
