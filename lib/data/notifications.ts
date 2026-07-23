// Data access: notifications (feed chung) + mốc đã xem + đếm cảnh báo.
import { createClient } from "@/lib/supabase/server";
import type { Notification } from "@/lib/types";
import { todayISO } from "@/lib/logic/overdue";

export interface NotificationInput {
  type: string;
  message: string;
  task_id?: string | null;
  project_id?: string | null;
}

export async function createNotification(
  input: NotificationInput,
): Promise<void> {
  const supabase = createClient();
  await supabase.from("notifications").insert({
    type: input.type,
    message: input.message,
    task_id: input.task_id ?? null,
    project_id: input.project_id ?? null,
  });
}

export async function listRecentNotifications(
  limit = 30,
): Promise<Notification[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data as Notification[]) ?? [];
}

/** Mốc "đã xem" của tài khoản hiện tại (null nếu chưa từng xem). */
export async function getLastSeen(): Promise<string | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("notification_seen")
    .select("last_seen_at")
    .eq("profile_id", user.id)
    .maybeSingle();
  return data?.last_seen_at ?? null;
}

export async function markSeen(): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("notification_seen")
    .upsert({ profile_id: user.id, last_seen_at: new Date().toISOString() });
}

/** Đếm việc quá hạn / cần bắt đầu (tính trực tiếp, không cần cron). */
export async function getAlertCounts(): Promise<{
  overdue: number;
  needStart: number;
}> {
  const supabase = createClient();
  const today = todayISO();

  const overdueQ = supabase
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .is("deleted_at", null)
    .is("completed_at", null)
    .neq("status", "hoan_thanh")
    .lt("due_date", today);

  const needStartQ = supabase
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .is("deleted_at", null)
    .is("completed_at", null)
    .eq("status", "chua_bat_dau")
    .lte("start_date", today);

  const [ov, ns] = await Promise.all([overdueQ, needStartQ]);
  return { overdue: ov.count ?? 0, needStart: ns.count ?? 0 };
}
