"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/cong-viec", label: "Công việc", icon: "📋" },
  { href: "/du-an", label: "Dự án", icon: "📁" },
];

const ADMIN_NAV = [
  { href: "/quan-tri/nguoi-dung", label: "Người dùng", icon: "👥" },
];

export function Sidebar({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <nav className="flex flex-col gap-1 p-3">
      {NAV.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            isActive(item.href)
              ? "bg-brand text-white"
              : "text-gray-700 hover:bg-gray-100"
          }`}
        >
          <span aria-hidden>{item.icon}</span>
          {item.label}
        </Link>
      ))}

      {isAdmin && (
        <>
          <div className="mt-4 px-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
            Quản trị
          </div>
          {ADMIN_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isActive(item.href)
                  ? "bg-brand text-white"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <span aria-hidden>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </>
      )}
    </nav>
  );
}
