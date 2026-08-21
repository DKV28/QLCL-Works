// Data access: activity_log (lịch sử hoạt động).
import { createClient } from "@/lib/supabase/server";
import { getSessionUserId } from "./profiles";
import type { ActivityEntry } from "@/lib/types";

export interface ActivityInput {
  task_id?: string | null;
  project_id?: string | null;
  action: string;
  detail?: string | null;
}

/** Ghi một dòng lịch sử với người thao tác là tài khoản đang đăng nhập. */
export async function recordActivity(input: ActivityInput): Promise<void> {
  const supabase = createClient();
  const actorId = await getSessionUserId();

  await supabase.from("activity_log").insert({
    task_id: input.task_id ?? null,
    project_id: input.project_id ?? null,
    actor_id: actorId,
    action: input.action,
    detail: input.detail ?? null,
  });
}

interface ActivityRow {
  id: string;
  task_id: string | null;
  project_id: string | null;
  actor_id: string | null;
  action: string;
  detail: string | null;
  created_at: string;
  profiles: { full_name: string | null; email: string | null } | null;
}

export async function listActivityByTask(
  taskId: string,
): Promise<ActivityEntry[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("activity_log")
    .select(
      "id, task_id, project_id, actor_id, action, detail, created_at, profiles ( full_name, email )",
    )
    .eq("task_id", taskId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return ((data as unknown as ActivityRow[]) ?? []).map((r) => ({
    id: r.id,
    task_id: r.task_id,
    project_id: r.project_id,
    actor_id: r.actor_id,
    actor_name: r.profiles?.full_name || r.profiles?.email || null,
    action: r.action,
    detail: r.detail,
    created_at: r.created_at,
  }));
}
