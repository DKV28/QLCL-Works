"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import {
  createTeamAction,
  deleteTeamAction,
  updateTeamAction,
} from "@/lib/actions/teams";
import type { Team } from "@/lib/types";

function TeamForm({
  team,
  teams,
  onDone,
}: {
  team?: Team;
  teams: Team[];
  onDone: () => void;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = team
        ? await updateTeamAction(team.id, formData)
        : await createTeamAction(formData);
      if (result.ok) {
        onDone();
        router.refresh();
      }
      else setError(result.error);
    });
  }

  function remove() {
    if (!team) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteTeamAction(team.id);
      if (result.ok) {
        onDone();
        router.refresh();
      }
      else setError(result.error);
    });
  }

  return (
    <form action={submit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor={`${team?.id ?? "new"}-team-name`}>
            Tên team/tổ
          </label>
          <input
            id={`${team?.id ?? "new"}-team-name`}
            name="name"
            className="input"
            defaultValue={team?.name ?? ""}
            placeholder={team ? undefined : "Ví dụ: Team Quận 9"}
            required
          />
        </div>
        <div>
          <label className="label" htmlFor={`${team?.id ?? "new"}-parent`}>
            Trực thuộc
          </label>
          <select
            id={`${team?.id ?? "new"}-parent`}
            name="parent_id"
            className="input"
            defaultValue={team?.parent_id ?? ""}
          >
            <option value="">— Cấp cao nhất —</option>
            {teams
              .filter((candidate) => candidate.id !== team?.id)
              .map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.name}
                </option>
              ))}
          </select>
        </div>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      {confirmingDelete && team && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
          Xóa “{team.name}”? Thao tác này không thể hoàn tác.
        </div>
      )}
      <div className="flex justify-end gap-2 pt-1">
        {team && !confirmingDelete && (
          <button
            type="button"
            className="btn-danger"
            disabled={pending}
            onClick={() => setConfirmingDelete(true)}
          >
            Xóa team
          </button>
        )}
        {confirmingDelete && (
          <>
            <button
              type="button"
              className="btn-secondary"
              disabled={pending}
              onClick={() => setConfirmingDelete(false)}
            >
              Hủy
            </button>
            <button
              type="button"
              className="btn-danger"
              disabled={pending}
              onClick={remove}
            >
              {pending ? "Đang xóa..." : "Xác nhận xóa"}
            </button>
          </>
        )}
        <button className="btn-primary" disabled={pending}>
          {pending ? "Đang lưu..." : team ? "Lưu thay đổi" : "Thêm team"}
        </button>
      </div>
    </form>
  );
}

export function TeamsClient({ teams }: { teams: Team[] }) {
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Team | null>(null);
  const parentName = (parentId: string | null) =>
    parentId ? teams.find((team) => team.id === parentId)?.name ?? "—" : "Cấp cao nhất";

  return (
    <div>
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Cơ cấu team/tổ</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Quản lý tên và quan hệ trực thuộc trong cơ cấu tổ chức.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand text-xl font-medium leading-none text-white hover:bg-brand-dark"
          aria-label="Thêm team"
          title="Thêm team"
        >
          +
        </button>
      </div>

      <div className="space-y-2">
        {teams.map((team) => (
          <div key={team.id} className="card flex items-center justify-between gap-4 p-4">
            <div className="min-w-0">
              <div className="truncate font-semibold">{team.name}</div>
              <div className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                Trực thuộc: {parentName(team.parent_id)}
              </div>
            </div>
            <button className="btn-secondary shrink-0 text-sm" onClick={() => setEditing(team)}>
              Sửa
            </button>
          </div>
        ))}
        {teams.length === 0 && <div className="empty-state">Chưa có team/tổ nào.</div>}
      </div>

      <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
        Chỉ team không có nhân sự và không có team con mới có thể xóa.
      </p>

      <Modal open={creating} onClose={() => setCreating(false)} title="Thêm team/tổ">
        <TeamForm teams={teams} onDone={() => setCreating(false)} />
      </Modal>
      <Modal open={editing !== null} onClose={() => setEditing(null)} title="Chỉnh sửa team/tổ">
        {editing && (
          <TeamForm
            team={editing}
            teams={teams}
            onDone={() => setEditing(null)}
          />
        )}
      </Modal>
    </div>
  );
}
