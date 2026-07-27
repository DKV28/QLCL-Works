"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createTeamAction, updateTeamAction } from "@/lib/actions/teams";
import type { Team } from "@/lib/types";

function TeamForm({
  team,
  teams,
}: {
  team?: Team;
  teams: Team[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = team
        ? await updateTeamAction(team.id, formData)
        : await createTeamAction(formData);
      if (result.ok) router.refresh();
      else setError(result.error);
    });
  }

  return (
    <form action={submit} className="border-b border-gray-100 p-4 last:border-0 dark:border-gray-800">
      <div className="grid items-end gap-3 md:grid-cols-[1fr_1fr_auto]">
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
        <button className={team ? "btn-secondary" : "btn-primary"} disabled={pending}>
          {pending ? "Đang lưu..." : team ? "Lưu" : "Thêm team"}
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </form>
  );
}

export function TeamsClient({ teams }: { teams: Team[] }) {
  return (
    <div>
      <div className="mb-5">
        <h2 className="text-xl font-semibold">Cơ cấu team/tổ</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Quản lý tên và quan hệ trực thuộc. Việc xóa không được cung cấp để
          tránh làm mất liên kết của nhân sự hiện có.
        </p>
      </div>
      <div className="card">
        <TeamForm teams={teams} />
        {teams.map((team) => (
          <TeamForm key={team.id} team={team} teams={teams} />
        ))}
      </div>
    </div>
  );
}
