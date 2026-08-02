import { signOut } from "@/lib/actions/auth";
import { ThemeToggle } from "./ThemeToggle";
import { NotificationBell } from "./NotificationBell";
import type { Profile } from "@/lib/types";

const ROLE_LABEL: Record<string, string> = {
  admin: "Quản trị viên",
  manager: "Quản lý",
  staff: "Thành viên",
};

export function TopBar({ profile }: { profile: Profile }) {
  return (
    <header className="sticky top-0 z-20 flex h-16 min-w-0 items-center justify-between gap-3 border-b border-slate-200/80 bg-white/90 px-3 backdrop-blur-md sm:px-6 dark:border-slate-800 dark:bg-slate-900/90">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand/10 text-sm font-bold text-brand ring-1 ring-brand/10 dark:bg-brand/15 dark:text-brand-light">
          {(profile.full_name || profile.email || "U").trim().charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
          {profile.full_name || profile.email}
          </div>
          <div className="hidden text-xs text-gray-500 sm:block dark:text-gray-400">
            {ROLE_LABEL[profile.role] ?? profile.role}
          </div>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        <NotificationBell />
        <ThemeToggle />
        <form action={signOut}>
          <button type="submit" className="btn-secondary px-2.5 text-sm sm:px-3.5">
            <span className="hidden sm:inline">Đăng xuất</span>
            <span className="sm:hidden">Thoát</span>
          </button>
        </form>
      </div>
    </header>
  );
}
