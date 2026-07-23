// Data access: attachments (metadata + xóa object trong Storage).
import { createClient } from "@/lib/supabase/server";
import { ATTACHMENTS_BUCKET, type Attachment } from "@/lib/types";

export interface AttachmentInput {
  task_id: string;
  file_name: string;
  storage_path: string;
  mime_type?: string | null;
  size_bytes?: number | null;
}

export async function createAttachment(
  input: AttachmentInput,
): Promise<Attachment> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("attachments")
    .insert(input)
    .select("*")
    .single();

  if (error) throw error;
  return data as Attachment;
}

/** Xóa tệp: gỡ object khỏi Storage rồi xóa bản ghi metadata. */
export async function deleteAttachment(id: string): Promise<void> {
  const supabase = createClient();

  const { data } = await supabase
    .from("attachments")
    .select("storage_path")
    .eq("id", id)
    .single();

  if (data?.storage_path) {
    await supabase.storage.from(ATTACHMENTS_BUCKET).remove([data.storage_path]);
  }

  const { error } = await supabase.from("attachments").delete().eq("id", id);
  if (error) throw error;
}
