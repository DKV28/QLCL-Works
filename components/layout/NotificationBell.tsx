"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
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

function notificationAppearance(type: string): {
  className: string;
  icon: ReactNode;
} {
  const iconClass = "h-4 w-4";
  if (type === "cong_viec_moi") {
    return {
      className: "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={iconClass} aria-hidden="true">
          <path d="M12 5v14M5 12h14" strokeLinecap="round" />
        </svg>
      ),
    };
  }
  if (type === "binh_luan_moi") {
    return {
      className: "bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-300",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={iconClass} aria-hidden="true">
          <path d="M20 15a3 3 0 0 1-3 3H9l-5 3V7a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3Z" strokeLinejoin="round" />
        </svg>
      ),
    };
  }
  if (type === "deadline_thay_doi") {
    return {
      className: "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={iconClass} aria-hidden="true">
          <circle cx="12" cy="12" r="8" />
          <path d="M12 8v5l3 2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    };
  }
  if (type === "phan_cong_thay_doi") {
    return {
      className: "bg-cyan-50 text-cyan-600 dark:bg-cyan-950/40 dark:text-cyan-300",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={iconClass} aria-hidden="true">
          <circle cx="9" cy="8" r="3" />
          <path d="M3.5 19a5.5 5.5 0 0 1 11 0M16 8h5M18.5 5.5v5" strokeLinecap="round" />
        </svg>
      ),
    };
  }
  if (type === "cong_viec_hoan_thanh") {
    return {
      className: "bg-green-50 text-green-600 dark:bg-green-950/40 dark:text-green-300",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={iconClass} aria-hidden="true">
          <circle cx="12" cy="12" r="8" />
          <path d="m8.5 12 2.3 2.3 4.8-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    };
  }
  if (
    type === "trang_thai_thay_doi" ||
    type === "cong_viec_mo_lai" ||
    type === "chuyen_buoc_quy_trinh"
  ) {
    return {
      className: "bg-brand/10 text-brand dark:text-brand-light",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={iconClass} aria-hidden="true">
          <path d="M5 7h11l-3-3M19 17H8l3 3M16 7l3 3-3 3M8 17l-3-3 3-3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    };
  }
  return {
    className: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-300",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={iconClass} aria-hidden="true">
        <circle cx="12" cy="12" r="8" />
        <path d="M12 8v4M12 16h.01" strokeLinecap="round" />
      </svg>
    ),
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
  const alerts = state?.alerts ?? { overdue: 0, needStart: 0 };
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
