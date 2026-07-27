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
    <header className="flex min-w-0 items-center justify-between gap-2 border-b border-gray-200 bg-white px-3 py-2 sm:px-6 sm:py-3 dark:border-gray-800 dark:bg-gray-900">
      <div className="min-w-0 truncate text-sm text-gray-500 dark:text-gray-400">
        <span className="hidden sm:inline">Xin chào, </span>
        <span className="font-medium text-gray-900 dark:text-gray-100">
          {profile.full_name || profile.email}
        </span>
        <span className="ml-2 hidden rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500 sm:inline dark:bg-gray-800 dark:text-gray-300">
          {ROLE_LABEL[profile.role] ?? profile.role}
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        <NotificationBell />
        <ThemeToggle />
        <form action={signOut}>
          <button type="submit" className="btn-secondary min-h-10 px-2 text-sm sm:px-3">
            <span className="hidden sm:inline">Đăng xuất</span>
            <span className="sm:hidden">Thoát</span>
          </button>
        </form>
      </div>
    </header>
  );
}
