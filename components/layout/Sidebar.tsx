"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChartBar,
  CheckSquare,
  FolderSimple,
  GearSix,
  UsersThree,
} from "@phosphor-icons/react";

const NAV = [
  { href: "/cong-viec", label: "Công việc" },
  { href: "/du-an", label: "Dự án" },
  { href: "/bao-cao", label: "Báo cáo" },
  { href: "/quan-tri/nhan-su", label: "Nhân sự" },
];

const ADMIN_NAV = [{ href: "/cai-dat", label: "Cài đặt" }];

function NavIcon({ href }: { href: string }) {
  const Icon =
    href === "/cong-viec"
      ? CheckSquare
      : href === "/du-an"
        ? FolderSimple
        : href === "/bao-cao"
          ? ChartBar
          : href === "/quan-tri/nhan-su"
            ? UsersThree
            : GearSix;
  return <Icon size={18} weight="regular" aria-hidden="true" />;
}

export function Sidebar({
  isAdmin,
  compact = false,
}: {
  isAdmin: boolean;
  compact?: boolean;
}) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  const linkClass = (href: string) =>
    `group flex min-h-10 items-center gap-3 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
      isActive(href)
        ? "bg-brand/10 text-brand shadow-[inset_3px_0_0_#0f766e] dark:bg-brand/15 dark:text-brand-light"
        : "text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
    }`;

  if (compact) {
    return (
      <nav className="flex gap-1 overflow-x-auto px-3 py-2.5" aria-label="Điều hướng chính">
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
    <nav className="flex flex-col gap-1 p-3" aria-label="Điều hướng chính">
      {NAV.map((item) => (
        <Link key={item.href} href={item.href} className={linkClass(item.href)}>
          <NavIcon href={item.href} />
          {item.label}
        </Link>
      ))}

      {isAdmin && (
        <>
          <div className="mb-1 mt-5 px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-400 dark:text-gray-500">
            Quản trị
          </div>
          {ADMIN_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={linkClass(item.href)}
            >
              <NavIcon href={item.href} />
              {item.label}
            </Link>
          ))}
        </>
      )}
    </nav>
  );
}
