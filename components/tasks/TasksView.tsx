"use client";

import { useMemo, useState } from "react";
import { TaskTable } from "./TaskTable";
import { filterTasks, sortTasks, type TaskFilters } from "@/lib/logic/filters";
import type { Profile, TaskWithAssignees } from "@/lib/types";

export function TasksView({
  tasks,
  assignees,
}: {
  tasks: TaskWithAssignees[];
  assignees: Pick<Profile, "id" | "full_name" | "email">[];
}) {
  const [filters, setFilters] = useState<TaskFilters>({});

  const visible = useMemo(
    () => sortTasks(filterTasks(tasks, filters)),
    [tasks, filters],
  );

  function update(patch: Partial<TaskFilters>) {
    setFilters((f) => ({ ...f, ...patch }));
  }

  function reset() {
    setFilters({});
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Công việc</h1>
        <span className="text-sm text-gray-500">
          {visible.length}/{tasks.length} công việc
        </span>
      </div>

      <div className="card mb-4 p-4">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="label">Từ khóa</label>
            <input
              className="input"
              placeholder="Tìm theo tên/mô tả..."
              value={filters.keyword ?? ""}
              onChange={(e) => update({ keyword: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Người phụ trách</label>
            <select
              className="input"
              value={filters.assigneeId ?? ""}
              onChange={(e) => update({ assigneeId: e.target.value })}
            >
              <option value="">Tất cả</option>
              {assignees.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.full_name || a.email}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Deadline từ</label>
            <input
              type="date"
              className="input"
              value={filters.fromDate ?? ""}
              onChange={(e) => update({ fromDate: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Deadline đến</label>
            <input
              type="date"
              className="input"
              value={filters.toDate ?? ""}
              onChange={(e) => update({ toDate: e.target.value })}
            />
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              className="h-4 w-4 accent-brand"
              checked={filters.onlyOverdue ?? false}
              onChange={(e) => update({ onlyOverdue: e.target.checked })}
            />
            Chỉ hiện công việc quá hạn
          </label>
          <button className="btn-secondary text-sm" onClick={reset}>
            Xóa bộ lọc
          </button>
        </div>
      </div>

      <TaskTable tasks={visible} assignees={assignees} />
    </div>
  );
}
