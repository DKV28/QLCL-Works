// Data access: notifications (feed) + mốc đã xem + đếm cảnh báo.
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, getSessionUserId } from "./profiles";
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

/** Id các công việc mà một tập nhân sự được phân công (chính hoặc hỗ trợ). */
async function assignedTaskIds(memberIds: string[]): Promise<string[]> {
  if (memberIds.length === 0) return [];
  const supabase = createClient();
  const { data } = await supabase
    .from("task_assignees")
    .select("task_id")
    .in("member_id", memberIds);
  return Array.from(
    new Set(((data as { task_id: string }[]) ?? []).map((r) => r.task_id)),
  );
}

/**
 * Thông báo gần đây cho TÀI KHOẢN hiện tại.
 *  - Admin/Quản lý: xem toàn bộ feed (để giám sát).
 *  - Thành viên: chỉ thấy thông báo của công việc mà nhân sự gắn với tài khoản
 *    họ được phân công — tránh loãng vì thông báo của tất cả mọi người.
 */
export async function listRecentNotifications(
  limit = 30,
): Promise<Notification[]> {
  const supabase = createClient();
  const me = await getCurrentProfile();

  let query = supabase
    .from("notifications")
    .select("*")
    .in("type", ["cong_viec_moi", "binh_luan_moi"])
    .order("created_at", { ascending: false })
    .limit(limit);

  // Thành viên: lọc theo công việc mình được phân công.
  if (me && me.role !== "admin" && me.role !== "manager") {
    const { data: myMembers } = await supabase
      .from("members")
      .select("id")
      .eq("profile_id", me.id);
    const memberIds = ((myMembers as { id: string }[]) ?? []).map((m) => m.id);
    const taskIds = await assignedTaskIds(memberIds);
    if (taskIds.length === 0) return [];
    query = query.in("task_id", taskIds);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data as Notification[]) ?? [];
}

/** Mốc "đã xem" của tài khoản hiện tại (null nếu chưa từng xem). */
export async function getLastSeen(): Promise<string | null> {
  const userId = await getSessionUserId();
  if (!userId) return null;

  const supabase = createClient();
  const { data } = await supabase
    .from("notification_seen")
    .select("last_seen_at")
    .eq("profile_id", userId)
    .maybeSingle();
  return data?.last_seen_at ?? null;
}

export async function markSeen(): Promise<void> {
  const userId = await getSessionUserId();
  if (!userId) return;

  const supabase = createClient();
  await supabase
    .from("notification_seen")
    .upsert({ profile_id: userId, last_seen_at: new Date().toISOString() });
}
