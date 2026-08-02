"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { Bell, ChatCircle, Info, Plus } from "@phosphor-icons/react";
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

function notificationAppearance(type: string): {
  className: string;
  icon: ReactNode;
} {
  if (type === "cong_viec_moi") {
    return {
      className: "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300",
      icon: <Plus size={16} weight="regular" aria-hidden="true" />,
    };
  }
  if (type === "binh_luan_moi") {
    return {
      className: "bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-300",
      icon: <ChatCircle size={16} weight="regular" aria-hidden="true" />,
    };
  }
  return {
    className: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-300",
    icon: <Info size={16} weight="regular" aria-hidden="true" />,
  };
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
  const unread = items.filter((n) => !lastSeen || n.created_at > lastSeen).length;

  async function markSeen() {
    await markNotificationsSeenAction();
    await load();
  }

  function openNotification() {
    setOpen(false);
    setState((current) =>
      current
        ? { ...current, lastSeen: new Date().toISOString() }
        : current,
    );
    void markNotificationsSeenAction();
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
        <Bell size={18} weight="regular" aria-hidden="true" />
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

            <div className="max-h-80 overflow-y-auto">
              {items.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-gray-400">
                  Chưa có thông báo.
                </p>
              ) : (
                items.map((n) => {
                  const isUnread = !lastSeen || n.created_at > lastSeen;
                  const appearance = notificationAppearance(n.type);
                  const href = n.task_id
                    ? `/cong-viec?task=${encodeURIComponent(n.task_id)}`
                    : n.project_id
                      ? `/du-an/${encodeURIComponent(n.project_id)}`
                      : "/cong-viec";
                  return (
                    <Link
                      key={n.id}
                      href={href}
                      onClick={openNotification}
                      className={`group flex gap-3 border-b border-gray-100 px-4 py-3 text-sm transition last:border-0 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/60 ${
                        isUnread ? "bg-brand/5 dark:bg-brand/[0.07]" : ""
                      }`}
                    >
                      <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${appearance.className}`}>
                        {appearance.icon}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="break-words leading-5 text-gray-800 group-hover:text-gray-950 dark:text-gray-200 dark:group-hover:text-white">
                          {n.message}
                        </div>
                        <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-gray-400">
                          <span>{formatDateTime(n.created_at)}</span>
                          <span className="font-medium text-brand opacity-0 transition group-hover:opacity-100">
                            {n.task_id
                              ? "Mở công việc"
                              : n.project_id
                                ? "Mở dự án"
                                : "Xem chi tiết"}
                          </span>
                        </div>
                      </div>
                    </Link>
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
