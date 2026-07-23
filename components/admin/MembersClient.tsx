"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import {
  createMemberAction,
  toggleMemberActiveAction,
  updateMemberAction,
} from "@/lib/actions/members";
import type { Member } from "@/lib/types";

type TeamOption = { id: string; name: string };

function MemberForm({
  member,
  teamOptions,
  onSubmit,
  onDone,
}: {
  member?: Member;
  teamOptions: TeamOption[];
  onSubmit: (formData: FormData) => Promise<{ ok: true } | { ok: false; error: string }>;
  onDone: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleAction(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await onSubmit(formData);
      if (res.ok) onDone();
      else setError(res.error);
    });
  }

  return (
    <form action={handleAction} className="space-y-4">
      <div>
        <label className="label" htmlFor="full_name">
          Họ tên <span className="text-red-500">*</span>
        </label>
        <input
          id="full_name"
          name="full_name"
          required
          defaultValue={member?.full_name}
          className="input"
        />
      </div>
      <div>
        <label className="label" htmlFor="team_id">
          Team / Tổ
        </label>
        <select
          id="team_id"
          name="team_id"
          defaultValue={member?.team_id ?? ""}
          className="input"
        >
          <option value="">— Chưa phân nhóm —</option>
          {teamOptions.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="note">
          Ghi chú
        </label>
        <input
          id="note"
          name="note"
          defaultValue={member?.note ?? ""}
          className="input"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          className="btn-secondary"
          onClick={onDone}
          disabled={pending}
        >
          Hủy
        </button>
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? "Đang lưu..." : "Lưu"}
        </button>
      </div>
    </form>
  );
}

export function MembersClient({
  members,
  teamOptions,
  canEdit,
}: {
  members: Member[];
  teamOptions: TeamOption[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Member | null>(null);
  const [, startTransition] = useTransition();

  const teamNameById = useMemo(
    () => new Map(teamOptions.map((t) => [t.id, t.name])),
    [teamOptions],
  );

  // Nhóm nhân sự theo team để hiển thị.
  const groups = useMemo(() => {
    const map = new Map<string, Member[]>();
    for (const m of members) {
      const key = m.team_id
        ? teamNameById.get(m.team_id) ?? "Khác"
        : "Chưa phân nhóm";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(m);
    }
    return Array.from(map.entries()).sort((a, b) =>
      a[0].localeCompare(b[0], "vi"),
    );
  }, [members, teamNameById]);

  function refresh() {
    setCreating(false);
    setEditing(null);
    router.refresh();
  }

  function handleToggleActive(m: Member) {
    startTransition(async () => {
      await toggleMemberActiveAction(m.id, !m.is_active);
      router.refresh();
    });
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Nhân sự</h1>
        {canEdit && (
          <button className="btn-primary" onClick={() => setCreating(true)}>
            Thêm nhân sự
          </button>
        )}
      </div>

      {!canEdit && (
        <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
          Bạn đang xem ở chế độ chỉ đọc. Chỉ Quản lý và Quản trị viên mới chỉnh
          sửa được danh sách nhân sự.
        </p>
      )}

      {members.length === 0 ? (
        <div className="card p-10 text-center text-gray-500 dark:text-gray-400">
          Chưa có nhân sự nào. Bấm &quot;Thêm nhân sự&quot; để bắt đầu.
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map(([team, ms]) => (
            <div key={team}>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                {team} ({ms.length})
              </h2>
              <div className="card overflow-x-auto">
                <table className="w-full min-w-[520px] text-sm">
                  <tbody>
                    {ms.map((m) => (
                      <tr
                        key={m.id}
                        className="border-b border-gray-100 last:border-0 dark:border-gray-800"
                      >
                        <td className="p-3">
                          <span
                            className={
                              m.is_active
                                ? "font-medium"
                                : "font-medium text-gray-400 line-through dark:text-gray-500"
                            }
                          >
                            {m.full_name}
                          </span>
                          {!m.is_active && (
                            <span className="ml-2 text-xs text-gray-400">
                              (ngừng hoạt động)
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-gray-500 dark:text-gray-400">
                          {m.note || ""}
                        </td>
                        <td className="p-3 text-right">
                          {canEdit && (
                            <div className="flex justify-end gap-2">
                              <button
                                className="btn-secondary text-xs"
                                onClick={() => setEditing(m)}
                              >
                                Sửa
                              </button>
                              <button
                                className="btn-secondary text-xs"
                                onClick={() => handleToggleActive(m)}
                              >
                                {m.is_active ? "Ngừng" : "Kích hoạt"}
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title="Thêm nhân sự"
      >
        <MemberForm
          teamOptions={teamOptions}
          onSubmit={createMemberAction}
          onDone={refresh}
        />
      </Modal>

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title="Sửa nhân sự"
      >
        {editing && (
          <MemberForm
            member={editing}
            teamOptions={teamOptions}
            onSubmit={(fd) => updateMemberAction(editing.id, fd)}
            onDone={refresh}
          />
        )}
      </Modal>
    </div>
  );
}
