"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateRolePermissionAction } from "@/lib/actions/permissions";
import {
  EDIT_SCOPE_LABEL,
  PERMISSION_RESOURCE_LABEL,
  ROLE_LABEL,
  type EditScope,
  type PermissionResource,
  type Role,
  type RolePermission,
} from "@/lib/types";

// Chỉ cho chỉnh Quản lý và Thành viên; Quản trị viên luôn toàn quyền.
const EDITABLE_ROLES: Role[] = ["manager", "staff"];
const RESOURCES: PermissionResource[] = ["project", "task"];
const SCOPES: EditScope[] = ["all", "own", "none"];

export function RolePermissionsClient({
  permissions,
}: {
  permissions: RolePermission[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function get(
    resource: PermissionResource,
    role: Role,
  ): RolePermission | undefined {
    return permissions.find((p) => p.resource === resource && p.role === role);
  }

  function save(
    resource: PermissionResource,
    role: Role,
    input: { edit_scope: EditScope; can_create: boolean },
  ) {
    setError(null);
    startTransition(async () => {
      const res = await updateRolePermissionAction(resource, role, input);
      if (res.ok) router.refresh();
      else setError(res.error);
    });
  }

  return (
    <div className="mt-10">
      <h2 className="text-lg font-semibold">Phân quyền theo vai trò</h2>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Điều chỉnh ai được tạo và sửa/xóa dự án, công việc. Thay đổi áp dụng ngay,
        không cần sửa mã nguồn. Quản trị viên luôn có toàn quyền.
      </p>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {RESOURCES.map((resource) => (
          <div key={resource} className="card overflow-x-auto">
            <div className="border-b border-gray-100 px-4 py-3 font-medium dark:border-gray-800">
              {PERMISSION_RESOURCE_LABEL[resource]}
            </div>
            <table className="w-full min-w-[360px] text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-500 dark:border-gray-800 dark:text-gray-400">
                  <th className="p-3">Vai trò</th>
                  <th className="p-3">Quyền sửa/xóa</th>
                  <th className="p-3 text-center">Tạo mới</th>
                </tr>
              </thead>
              <tbody>
                {/* Quản trị viên: cố định toàn quyền */}
                <tr className="border-b border-gray-100 text-gray-500 dark:border-gray-800 dark:text-gray-400">
                  <td className="p-3 font-medium">{ROLE_LABEL.admin}</td>
                  <td className="p-3">{EDIT_SCOPE_LABEL.all}</td>
                  <td className="p-3 text-center">✓</td>
                </tr>

                {EDITABLE_ROLES.map((role) => {
                  const perm = get(resource, role);
                  const scope = perm?.edit_scope ?? "own";
                  const canCreate = perm?.can_create ?? true;
                  return (
                    <tr
                      key={role}
                      className="border-b border-gray-100 last:border-0 dark:border-gray-800"
                    >
                      <td className="p-3 font-medium">{ROLE_LABEL[role]}</td>
                      <td className="p-3">
                        <select
                          className="input max-w-[180px]"
                          value={scope}
                          disabled={pending}
                          onChange={(e) =>
                            save(resource, role, {
                              edit_scope: e.target.value as EditScope,
                              can_create: canCreate,
                            })
                          }
                        >
                          {SCOPES.map((s) => (
                            <option key={s} value={s}>
                              {EDIT_SCOPE_LABEL[s]}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="p-3 text-center">
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-brand"
                          checked={canCreate}
                          disabled={pending}
                          onChange={(e) =>
                            save(resource, role, {
                              edit_scope: scope,
                              can_create: e.target.checked,
                            })
                          }
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      <p className="mt-3 text-xs text-gray-400 dark:text-gray-500">
        <b>Tất cả</b>: sửa/xóa mọi mục. <b>Chỉ mục của mình</b>: chỉ sửa/xóa dự án
        mình sở hữu và công việc mình tạo. <b>Không được sửa</b>: chỉ xem. Mọi vai
        trò vẫn xem chung toàn bộ dữ liệu.
      </p>
    </div>
  );
}
