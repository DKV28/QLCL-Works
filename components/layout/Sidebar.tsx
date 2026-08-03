"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/cong-viec", label: "Công việc" },
  { href: "/du-an", label: "Dự án" },
  { href: "/bao-cao", label: "Báo cáo" },
  { href: "/quan-tri/nhan-su", label: "Nhân sự" },
];

const ADMIN_NAV = [{ href: "/cai-dat", label: "Cài đặt" }];

function NavIcon({ href }: { href: string }) {
  const path =
    href === "/cong-viec"
      ? "M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"
      : href === "/du-an"
        ? "M3 7h5l2 2h11v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"
        : href === "/bao-cao"
          ? "M4 19V9m6 10V5m6 14v-7m4 7H2"
          : href === "/quan-tri/nhan-su"
            ? "M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2m7-10a4 4 0 100-8 4 4 0 000 8zm13 10v-2a4 4 0 00-3-3.87m-2-12a4 4 0 010 7.75"
            : "M12 15.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7zm7.4-3.5a7.6 7.6 0 00-.1-1l2-1.5-2-3.5-2.4 1a8 8 0 00-1.7-1L15 3h-6l-.3 3a8 8 0 00-1.7 1L4.6 6 2.5 9.5l2.1 1.5a7.6 7.6 0 000 2L2.5 14.5 4.6 18 7 17a8 8 0 001.7 1l.3 3h6l.3-3a8 8 0 001.7-1l2.4 1 2-3.5-2-1.5a7.6 7.6 0 00.1-1z";
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-[18px] w-[18px] shrink-0"
      aria-hidden="true"
    >
      <path d={path} />
    </svg>
  );
}

export function Sidebar({
  isAdmin,
  compact = false,
  collapsed = false,
}: {
  isAdmin: boolean;
  compact?: boolean;
  collapsed?: boolean;
}) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  const linkClass = (href: string) =>
    `flex min-h-10 items-center gap-3 whitespace-nowrap rounded-lg py-2 text-sm font-medium transition-colors ${
      collapsed ? "justify-center px-2" : "px-3"} ${
      isActive(href)
        ? "bg-brand/10 text-brand dark:bg-brand/15 dark:text-brand-light"
        : "text-gray-600 hover:bg-gray-100 hover:text-gray-950 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
    }`;

  if (compact) {
    return (
      <nav className="flex gap-1 overflow-x-auto px-3 py-2">
        {[...NAV, ...(isAdmin ? ADMIN_NAV : [])].map((item) => (
          <Link key={item.href} href={item.href} className={linkClass(item.href)}>
            <NavIcon href={item.href} />
            {item.label}
          </Link>
        ))}
      </nav>
    );
  }

  return (
    <nav className="flex flex-col gap-1 p-3">
      {NAV.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={linkClass(item.href)}
          title={collapsed ? item.label : undefined}
          aria-label={collapsed ? item.label : undefined}
        >
          <NavIcon href={item.href} />
          {!collapsed && item.label}
        </Link>
      ))}

      {isAdmin && (
        <>
          {!collapsed && (
            <div className="mb-1 mt-5 px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-400 dark:text-gray-500">
              Quản trị
            </div>
          )}
          {ADMIN_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={linkClass(item.href)}
              title={collapsed ? item.label : undefined}
              aria-label={collapsed ? item.label : undefined}
            >
              <NavIcon href={item.href} />
              {!collapsed && item.label}
            </Link>
          ))}
        </>
      )}
    </nav>
  );
}
