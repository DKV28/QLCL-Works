"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/cong-viec", label: "Công việc" },
  { href: "/du-an", label: "Dự án" },
  { href: "/quan-tri/nhan-su", label: "Nhân sự" },
];

const ADMIN_NAV = [{ href: "/quan-tri/nguoi-dung", label: "Người dùng" }];

export function Sidebar({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  const linkClass = (href: string) =>
    `block rounded-md px-3 py-2 text-sm font-medium transition-colors ${
      isActive(href)
        ? "bg-brand text-white"
        : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
    }`;

  return (
    <nav className="flex flex-col gap-1 p-3">
      {NAV.map((item) => (
        <Link key={item.href} href={item.href} className={linkClass(item.href)}>
          {item.label}
        </Link>
      ))}

      {isAdmin && (
        <>
          <div className="mt-4 px-3 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
            Quản trị
          </div>
          {ADMIN_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={linkClass(item.href)}
            >
              {item.label}
            </Link>
          ))}
        </>
      )}
    </nav>
  );
}
