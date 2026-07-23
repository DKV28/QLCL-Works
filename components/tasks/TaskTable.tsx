"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  NeedStartBadge,
  OverdueBadge,
  PriorityBadge,
  StatusBadge,
} from "@/components/ui/Badges";
import { TaskEditModal } from "./TaskEditModal";
import {
  deleteTaskAction,
  toggleCompleteAction,
} from "@/lib/actions/tasks";
import { isOverdue, needsAttention, needsToStart } from "@/lib/logic/overdue";
import { formatFriendlyDate } from "@/lib/logic/dates";
import type { MemberLite, TaskWithAssignees } from "@/lib/types";

export function TaskTable({
  tasks,
  members,
}: {
  tasks: TaskWithAssignees[];
  members: MemberLite[];
}) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  // Bản sao cục bộ để cập nhật lạc quan (tick/xóa phản hồi tức thì).
  const [localTasks, setLocalTasks] = useState(tasks);
  useEffect(() => setLocalTasks(tasks), [tasks]);

  const editing = localTasks.find((t) => t.id === editingId) ?? null;

  function handleToggle(task: TaskWithAssignees, checked: boolean) {
    setLocalTasks((prev) =>
      prev.map((t) =>
        t.id === task.id
          ? {
              ...t,
              completed_at: checked ? new Date().toISOString() : null,
              status: checked
                ? "hoan_thanh"
                : t.status === "hoan_thanh"
                  ? "dang_lam"
                  : t.status,
            }
          : t,
      ),
    );
    toggleCompleteAction(task.id, checked).then((res) => {
      if (!res.ok) setLocalTasks(tasks);
      else router.refresh();
    });
  }

  function handleDelete(task: TaskWithAssignees) {
    if (!confirm(`Xóa công việc "${task.title}"?`)) return;
    setLocalTasks((prev) => prev.filter((t) => t.id !== task.id));
    deleteTaskAction(task.id, task.project_id).then((res) => {
      if (!res.ok) setLocalTasks(tasks);
      else router.refresh();
    });
  }

  if (localTasks.length === 0) {
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
          {localTasks.map((t) => {
            const overdue = isOverdue(t);
            const startLate = needsToStart(t);
            const attention = needsAttention(t);
            const done = t.status === "hoan_thanh" || !!t.completed_at;
            return (
              <tr
                key={t.id}
                className={`border-b border-gray-100 last:border-0 dark:border-gray-800 ${
                  attention ? "bg-red-50 dark:bg-red-950/30" : ""
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
                  <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-gray-500 dark:text-gray-400">
                    {t.subtasks.length > 0 && (
                      <span>
                        Nhiệm vụ con:{" "}
                        {t.subtasks.filter((s) => s.is_done).length}/
                        {t.subtasks.length}
                      </span>
                    )}
                    {t.attachments.length > 0 && (
                      <span>{t.attachments.length} tệp đính kèm</span>
                    )}
                  </div>
                </td>
                <td className="p-3 align-top text-gray-700 dark:text-gray-300">
                  {t.primary ? (
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {t.primary.full_name}
                        <span className="ml-1 text-xs font-normal text-gray-400 dark:text-gray-500">
                          (chính)
                        </span>
                      </span>
                      {t.supporters.length > 0 && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          Hỗ trợ:{" "}
                          {t.supporters.map((s) => s.full_name).join(", ")}
                        </span>
                      )}
                    </div>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="p-3 align-top">
                  <div className="flex flex-col items-start gap-1">
                    <span className={overdue ? "font-medium text-red-600" : ""}>
                      {formatFriendlyDate(t.due_date)}
                    </span>
                    {overdue && <OverdueBadge />}
                    {startLate && !overdue && <NeedStartBadge />}
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
                      onClick={() => setEditingId(t.id)}
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

      <TaskEditModal
        task={editing}
        members={members}
        onClose={() => setEditingId(null)}
      />
    </div>
  );
}
