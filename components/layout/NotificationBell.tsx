"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  getNotificationsAction,
  markNotificationsSeenAction,
  type NotificationState,
} from "@/lib/actions/notifications";

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)} ${p(d.getHours())}:${p(
    d.getMinutes(),
  )}`;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<NotificationState | null>(null);

  const load = useCallback(async () => {
    setState(await getNotificationsAction());
  }, []);

  useEffect(() => {
    load();
    // Realtime: có thông báo mới -> tải lại
    const supabase = createClient();
    const channel = supabase
      .channel("notifications-feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  const items = state?.items ?? [];
  const lastSeen = state?.lastSeen ?? null;
  const alerts = state?.alerts ?? { overdue: 0, needStart: 0 };
  const unread = items.filter((n) => !lastSeen || n.created_at > lastSeen).length;

  async function markSeen() {
    await markNotificationsSeenAction();
    await load();
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="btn-secondary relative w-10 px-0"
        aria-label="Thông báo"
        title="Thông báo"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-[18px] w-[18px]" aria-hidden="true">
          <path d="M18 8a6 6 0 00-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-600 px-1 text-xs font-semibold text-white">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-40 mt-2 w-[min(22rem,calc(100vw-1.5rem))] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900">
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-800">
              <span className="text-sm font-semibold">Thông báo</span>
              {unread > 0 && (
                <button
                  onClick={markSeen}
                  className="text-xs text-brand hover:underline"
                >
                  Đánh dấu đã đọc
                </button>
              )}
            </div>

            {(alerts.overdue > 0 || alerts.needStart > 0) && (
              <Link
                href="/cong-viec"
                onClick={() => setOpen(false)}
                className="block border-b border-gray-200 bg-red-50 px-4 py-2 text-xs text-red-700 hover:bg-red-100 dark:border-gray-800 dark:bg-red-950/30 dark:text-red-300"
              >
                {alerts.overdue > 0 && `${alerts.overdue} việc quá hạn`}
                {alerts.overdue > 0 && alerts.needStart > 0 && " · "}
                {alerts.needStart > 0 && `${alerts.needStart} việc cần bắt đầu`}
              </Link>
            )}

            <div className="max-h-80 overflow-y-auto">
              {items.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-gray-400">
                  Chưa có thông báo.
                </p>
              ) : (
                items.map((n) => {
                  const isUnread = !lastSeen || n.created_at > lastSeen;
                  return (
                    <div
                      key={n.id}
                      className={`border-b border-gray-100 px-4 py-2 text-sm last:border-0 dark:border-gray-800 ${
                        isUnread ? "bg-brand/5" : ""
                      }`}
                    >
                      <div className="text-gray-800 dark:text-gray-200">
                        {n.message}
                      </div>
                      <div className="mt-0.5 text-[11px] text-gray-400">
                        {formatDateTime(n.created_at)}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
