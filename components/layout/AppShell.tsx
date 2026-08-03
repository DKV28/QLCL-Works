"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import type { Profile } from "@/lib/types";

const SIDEBAR_STORAGE_KEY = "qlcl-sidebar-collapsed";

function ChevronIcon({ collapsed }: { collapsed: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d={collapsed ? "m9 18 6-6-6-6" : "m15 18-6-6 6-6"} />
    </svg>
  );
}

export function AppShell({
  profile,
  children,
}: {
  profile: Profile;
  children: React.ReactNode;
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    setSidebarCollapsed(localStorage.getItem(SIDEBAR_STORAGE_KEY) === "true");
  }, []);

  function toggleSidebar() {
    setSidebarCollapsed((current) => {
      const next = !current;
      localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next));
      return next;
    });
  }

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
      <aside
        className={`hidden shrink-0 border-r border-gray-200/80 bg-white transition-[width] duration-200 md:block dark:border-gray-800 dark:bg-gray-900 ${
          sidebarCollapsed ? "w-[4.5rem]" : "w-64"
        }`}
      >
        <div
          className={`relative flex h-16 items-center border-b border-gray-200/80 dark:border-gray-800 ${
            sidebarCollapsed ? "justify-center px-2" : "justify-between px-5"
          }`}
        >
          <Link
            href="/"
            className="flex min-w-0 items-center gap-2.5 font-bold tracking-tight text-gray-950 dark:text-white"
            aria-label="QLCL Works"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand text-sm text-white">
              Q
            </span>
            {!sidebarCollapsed && <span className="truncate">QLCL Works</span>}
          </Link>
          <button
            type="button"
            onClick={toggleSidebar}
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white ${
              sidebarCollapsed ? "absolute -right-4 z-10 border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900" : ""
            }`}
            aria-label={sidebarCollapsed ? "Mở rộng thanh bên" : "Thu gọn thanh bên"}
            title={sidebarCollapsed ? "Mở rộng thanh bên" : "Thu gọn thanh bên"}
          >
            <ChevronIcon collapsed={sidebarCollapsed} />
          </button>
        </div>
        <Sidebar isAdmin={profile.role === "admin"} collapsed={sidebarCollapsed} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar profile={profile} />
        <div className="border-b border-gray-200 bg-white md:hidden dark:border-gray-800 dark:bg-gray-900">
          <Sidebar isAdmin={profile.role === "admin"} compact />
        </div>
        <main className="flex-1 overflow-x-hidden p-3 sm:p-5 md:p-7">
          <div className="mx-auto w-full max-w-[1680px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
