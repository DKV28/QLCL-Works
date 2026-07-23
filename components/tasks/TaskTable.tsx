"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import {
  OverdueBadge,
  PriorityBadge,
  StatusBadge,
} from "@/components/ui/Badges";
import { TaskForm } from "./TaskForm";
import {
  deleteTaskAction,
  toggleCompleteAction,
  updateTaskAction,
} from "@/lib/actions/tasks";
import { isOverdue } from "@/lib/logic/overdue";
import type { Profile, TaskWithAssignees } from "@/lib/types";

function formatDate(d: string | null): string {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

export function TaskTable({
  tasks,
  assignees,
}: {
  tasks: TaskWithAssignees[];
  assignees: Pick<Profile, "id" | "full_name" | "email">[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<TaskWithAssignees | null>(null);
  const [, startTransition] = useTransition();

  function handleToggle(task: TaskWithAssignees, checked: boolean) {
    startTransition(async () => {
      await toggleCompleteAction(task.id, checked);
      router.refresh();
    });
  }

  function handleDelete(task: TaskWithAssignees) {
    if (!confirm(`Xóa công việc "${task.title}"?`)) return;
    startTransition(async () => {
      await deleteTaskAction(task.id, task.project_id);
      router.refresh();
    });
  }

  if (tasks.length === 0) {
    return (
      <div className="card p-10 text-center text-gray-500 dark:text-gray-400">
        Không có công việc nào.
      </div>
    );
  }

  return (
    <div className="card overflow-x-auto">
      <table className="w-full min-w-[720px] text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500 dark:border-gray-800 dark:text-gray-400">
            <th className="w-10 p-3"></th>
            <th className="p-3">Công việc</th>
            <th className="p-3">Người phụ trách</th>
            <th className="p-3">Deadline</th>
            <th className="p-3">Ưu tiên</th>
            <th className="p-3">Trạng thái</th>
            <th className="p-3 text-right">Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((t) => {
            const overdue = isOverdue(t);
            const done = t.status === "hoan_thanh" || !!t.completed_at;
            return (
              <tr
                key={t.id}
                className={`border-b border-gray-100 last:border-0 dark:border-gray-800 ${
                  overdue ? "bg-red-50 dark:bg-red-950/30" : ""
                }`}
              >
                <td className="p-3 align-top">
                  <input
                    type="checkbox"
                    checked={done}
                    onChange={(e) => handleToggle(t, e.target.checked)}
                    className="h-4 w-4 cursor-pointer accent-brand"
                    aria-label="Đánh dấu hoàn thành"
                  />
                </td>
                <td className="p-3 align-top">
                  <div
                    className={`font-medium ${
                      done
                        ? "text-gray-400 line-through dark:text-gray-500"
                        : "text-gray-900 dark:text-gray-100"
                    }`}
                  >
                    {t.title}
                  </div>
                  {t.description && (
                    <div className="mt-0.5 text-xs text-gray-500 line-clamp-2 dark:text-gray-400">
                      {t.description}
                    </div>
                  )}
                </td>
                <td className="p-3 align-top text-gray-700 dark:text-gray-300">
                  {t.assignees.length > 0
                    ? t.assignees
                        .map((a) => a.full_name || a.email)
                        .join(", ")
                    : "—"}
                </td>
                <td className="p-3 align-top">
                  <div className="flex flex-col gap-1">
                    <span className={overdue ? "font-medium text-red-600" : ""}>
                      {formatDate(t.due_date)}
                    </span>
                    {overdue && <OverdueBadge />}
                  </div>
                </td>
                <td className="p-3 align-top">
                  <PriorityBadge value={t.priority} />
                </td>
                <td className="p-3 align-top">
                  <StatusBadge value={t.status} />
                </td>
                <td className="p-3 align-top text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      className="btn-secondary text-xs"
                      onClick={() => setEditing(t)}
                    >
                      Sửa
                    </button>
                    <button
                      className="btn-danger text-xs"
                      onClick={() => handleDelete(t)}
                    >
                      Xóa
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title="Sửa công việc"
      >
        {editing && (
          <TaskForm
            task={editing}
            assignees={assignees}
            onSubmit={(fd) => updateTaskAction(editing.id, editing.project_id, fd)}
            onDone={() => {
              setEditing(null);
              router.refresh();
            }}
          />
        )}
      </Modal>
    </div>
  );
}
