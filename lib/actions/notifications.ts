"use server";

import {
  getLastSeen,
  listRecentNotifications,
  markSeen,
} from "@/lib/data/notifications";
import type { Notification } from "@/lib/types";

export interface NotificationState {
  items: Notification[];
  lastSeen: string | null;
}

export async function getNotificationsAction(): Promise<NotificationState> {
  const [items, lastSeen] = await Promise.all([
    listRecentNotifications(30),
    getLastSeen(),
  ]);
  return { items, lastSeen };
}

export async function markNotificationsSeenAction(): Promise<{ ok: true }> {
  await markSeen();
  return { ok: true };
}
