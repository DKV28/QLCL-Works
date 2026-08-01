"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import {
  createUserAction,
  updateUserRoleAction,
  updateUserTeamAction,
} from "@/lib/actions/admin";
import type { Profile, Role, Team } from "@/lib/types";

const ROLE_OPTIONS: [Role, string][] = [
  ["staff", "Thành viên"],
  ["team_lead", "Teamlead"],
  ["manager", "Quản lý"],
  ["admin", "Quản trị viên"],
];

function displayIdentity(email: string | null): string {
  if (!email) return "—";
  const suffix = "@users.qlcl.local";
  return email.endsWith(suffix) ? email.slice(0, -suffix.length) : email;
}

export function UsersClient({ users, teams }: { users: Profile[]; teams: Team[] }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleCreate(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await createUserAction(formData);
      if (res.ok) {
        setCreating(false);
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  function handleRoleChange(userId: string, role: Role) {
    startTransition(async () => {
      const res = await updateUserRoleAction(userId, role);
      if (!res.ok) setError(res.error);
      router.refresh();
    });
  }

  function handleTeamChange(userId: string, teamId: string) {
    startTransition(async () => {
      const res = await updateUserTeamAction(userId, teamId || null);
      if (!res.ok) setError(res.error);
      router.refresh();
    });
  }

  return (
    <div>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Người dùng</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Quản lý tài khoản và vai trò truy cập hệ thống.
          </p>
        </div>
        <button className="btn-primary" onClick={() => setCreating(true)}>
          <span className="text-lg leading-none">+</span>
          Tài khoản
        </button>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500 dark:border-gray-800 dark:text-gray-400">
              <th className="p-3">Họ tên</th>
              <th className="p-3">Tên đăng nhập / Email</th>
              <th className="p-3">Vai trò</th>
              <th className="p-3">Team</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr
                key={u.id}
                className="border-b border-gray-100 last:border-0 dark:border-gray-800"
              >
                <td className="p-3 font-medium">{u.full_name || "—"}</td>
                <td className="p-3 text-gray-600 dark:text-gray-400">
                  {displayIdentity(u.email)}
                </td>
                <td className="p-3">
                  <select
                    className="input max-w-[160px]"
                    defaultValue={u.role}
                    disabled={pending}
                    onChange={(e) =>
                      handleRoleChange(u.id, e.target.value as Role)
                    }
                  >
                    {ROLE_OPTIONS.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="p-3">
                  <select
                    className="input min-w-[180px]"
                    value={u.team_id ?? ""}
                    disabled={pending}
                    onChange={(e) => handleTeamChange(u.id, e.target.value)}
                  >
                    <option value="">Chưa gán team</option>
                    {teams.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.name}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-gray-400 dark:text-gray-500">
        Đổi vai trò hoặc team áp dụng ngay. Quản lý và Quản trị xem mọi team;
        Teamlead và Thành viên chỉ xem team được gán cùng công việc chung toàn phòng.
        Quyền tạo và sửa/xóa được điều chỉnh ở mục “Phân quyền theo vai trò” bên dưới.
      </p>

      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title="Tạo tài khoản mới"
      >
        <form action={handleCreate} className="space-y-4">
          <div>
            <label className="label" htmlFor="full_name">
              Họ tên
            </label>
            <input id="full_name" name="full_name" className="input" />
          </div>
          <div>
            <label className="label" htmlFor="email">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="input"
            />
          </div>
          <div>
            <label className="label" htmlFor="password">
              Mật khẩu tạm <span className="text-red-500">*</span>
            </label>
            <input
              id="password"
              name="password"
              type="text"
              required
              minLength={6}
              className="input"
              placeholder="Ít nhất 6 ký tự"
            />
          </div>
          <div>
            <label className="label" htmlFor="role">
              Vai trò
            </label>
            <select id="role" name="role" defaultValue="staff" className="input">
              {ROLE_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="team_id">
              Team
            </label>
            <select id="team_id" name="team_id" defaultValue="" className="input">
              <option value="">Chưa gán team</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Tài khoản chưa gán team chỉ thấy công việc chung toàn phòng.
            </p>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setCreating(false)}
              disabled={pending}
            >
              Hủy
            </button>
            <button type="submit" className="btn-primary" disabled={pending}>
              {pending ? "Đang tạo..." : "Tạo tài khoản"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
