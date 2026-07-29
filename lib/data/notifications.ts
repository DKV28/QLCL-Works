// Data access: notifications (feed chung) + mốc đã xem + đếm cảnh báo.
import { createClient } from "@/lib/supabase/server";
import type { Notification } from "@/lib/types";

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
    .in("type", ["cong_viec_moi", "binh_luan_moi"])
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
