// Data access: comments (bình luận trên công việc).
import { createClient } from "@/lib/supabase/server";
import { getSessionUserId } from "./profiles";
import type { Comment } from "@/lib/types";

interface CommentRow {
  id: string;
  task_id: string;
  author_id: string | null;
  body: string;
  created_at: string;
  profiles: { full_name: string | null; email: string | null } | null;
}

export async function listCommentsByTask(taskId: string): Promise<Comment[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("comments")
    .select("id, task_id, author_id, body, created_at, profiles ( full_name, email )")
    .eq("task_id", taskId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return ((data as unknown as CommentRow[]) ?? []).map((r) => ({
    id: r.id,
    task_id: r.task_id,
    author_id: r.author_id,
    author_name: r.profiles?.full_name || r.profiles?.email || null,
    body: r.body,
    created_at: r.created_at,
  }));
}

export async function createComment(
  taskId: string,
  body: string,
): Promise<void> {
  const supabase = createClient();
  const authorId = await getSessionUserId();

  const { error } = await supabase.from("comments").insert({
    task_id: taskId,
    author_id: authorId,
    body,
  });
  if (error) throw error;
}

export async function deleteComment(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("comments").delete().eq("id", id);
  if (error) throw error;
}
