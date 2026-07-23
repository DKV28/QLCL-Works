// Data access: tags (nhãn) + gán nhãn cho công việc.
import { createClient } from "@/lib/supabase/server";
import type { Tag } from "@/lib/types";

export async function listTags(): Promise<Tag[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("tags")
    .select("*")
    .order("name", { ascending: true });
  if (error) throw error;
  return (data as Tag[]) ?? [];
}

export async function createTag(name: string, color: string): Promise<Tag> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("tags")
    .insert({ name, color })
    .select("*")
    .single();
  if (error) throw error;
  return data as Tag;
}

export async function updateTag(
  id: string,
  input: { name?: string; color?: string },
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("tags").update(input).eq("id", id);
  if (error) throw error;
}

export async function deleteTag(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("tags").delete().eq("id", id);
  if (error) throw error;
}

/** Gán nhãn cho công việc: xóa hết rồi thêm lại theo danh sách. */
export async function setTaskTags(
  taskId: string,
  tagIds: string[],
): Promise<void> {
  const supabase = createClient();
  await supabase.from("task_tags").delete().eq("task_id", taskId);
  const rows = tagIds
    .filter(Boolean)
    .map((tag_id) => ({ task_id: taskId, tag_id }));
  if (rows.length) {
    const { error } = await supabase.from("task_tags").insert(rows);
    if (error) throw error;
  }
}
