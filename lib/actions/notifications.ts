"use server";

import {
  getAlertCounts,
  getLastSeen,
  listRecentNotifications,
  markSeen,
} from "@/lib/data/notifications";
import type { Notification } from "@/lib/types";

export interface NotificationState {
  items: Notification[];
  lastSeen: string | null;
  alerts: { overdue: number; needStart: number };
}

export async function getNotificationsAction(): Promise<NotificationState> {
  const [items, lastSeen, alerts] = await Promise.all([
    listRecentNotifications(30),
    getLastSeen(),
    getAlertCounts(),
  ]);
  return { items, lastSeen, alerts };
}

export async function markNotificationsSeenAction(): Promise<{ ok: true }> {
  await markSeen();
  return { ok: true };
}
