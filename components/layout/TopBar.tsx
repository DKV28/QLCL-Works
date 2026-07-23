import { signOut } from "@/lib/actions/auth";
import { ThemeToggle } from "./ThemeToggle";
import type { Profile } from "@/lib/types";

const ROLE_LABEL: Record<string, string> = {
  admin: "Quản trị viên",
  manager: "Quản lý",
  staff: "Nhân viên",
};

export function TopBar({ profile }: { profile: Profile }) {
  return (
    <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3 dark:border-gray-800 dark:bg-gray-900">
      <div className="text-sm text-gray-500 dark:text-gray-400">
        Xin chào,{" "}
        <span className="font-medium text-gray-900 dark:text-gray-100">
          {profile.full_name || profile.email}
        </span>
        <span className="ml-2 rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-300">
          {ROLE_LABEL[profile.role] ?? profile.role}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <form action={signOut}>
          <button type="submit" className="btn-secondary text-sm">
            Đăng xuất
          </button>
        </form>
      </div>
    </header>
  );
}
