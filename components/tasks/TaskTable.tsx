"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArisingBadge,
  NeedStartBadge,
  OverdueBadge,
  StatusBadge,
  StepBadge,
} from "@/components/ui/Badges";
import { TaskEditModal } from "./TaskEditModal";
import {
  advanceVanHanhStepAction,
  deleteTaskAction,
  duplicateTaskAction,
  toggleCompleteAction,
} from "@/lib/actions/tasks";
import { VAN_HANH_STEPS } from "@/lib/logic/van-hanh";
import { getWorkflowStepsAction } from "@/lib/actions/settings";
import { ActionsMenu, type ActionItem } from "@/components/ui/ActionsMenu";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";
import { TagChips } from "@/components/ui/TagChips";
import { isOverdue, needsAttention, needsToStart } from "@/lib/logic/overdue";
import { formatFriendlyDate } from "@/lib/logic/dates";
import type {
  MemberLite,
  Tag,
  TaskPrioritySetting,
  TaskStatusSetting,
  TaskWithAssignees,
  WorkflowStepSetting,
} from "@/lib/types";

type SortKey = "title" | "assignee" | "due_date" | "arising" | "status";
type SortDirection = "asc" | "desc";

export function TaskTable({
  tasks,
  members,
  tags,
  prioritySettings,
  statusSettings,
  onTaskChange,
  onTaskRemove,
  workMemberId = "",
  workTaskIds = new Set<string>(),
  onToggleWorkLog = () => {},
}: {
  tasks: TaskWithAssignees[];
  members: MemberLite[];
  tags: Tag[];
  prioritySettings: TaskPrioritySetting[];
  statusSettings: TaskStatusSetting[];
  onTaskChange: (task: TaskWithAssignees) => void;
  onTaskRemove: (id: string) => void;
  workMemberId?: string;
  workTaskIds?: Set<string>;
  onToggleWorkLog?: (taskId: string, enabled: boolean) => void;
}) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [actionError, setActionError] = useState<string | null>(null);
  const { confirm, confirmDialog } = useConfirmDialog();
  const [workflowSteps, setWorkflowSteps] = useState<WorkflowStepSetting[]>(
    VAN_HANH_STEPS.map((step) => ({
      code: step.code,
      label: step.label,
      role_label: step.role,
      sla_days: step.slaDays,
      sort_order: step.order * 10,
      is_active: true,
      is_system: true,
      created_at: "",
      updated_at: "",
    })),
  );

  useEffect(() => {
    getWorkflowStepsAction().then((steps) => {
      if (steps.length > 0) setWorkflowSteps(steps);
    });
  }, []);

  const getStep = (code: string | null) =>
    workflowSteps.find((step) => step.code === code);
  const getNextStep = (code: string | null) => {
    const current = getStep(code);
    if (!current) return undefined;
    return workflowSteps
      .filter((step) => step.is_active && step.sort_order > current.sort_order)
      .sort((a, b) => a.sort_order - b.sort_order)[0];
  };
  const isLastStep = (code: string | null) => !!getStep(code) && !getNextStep(code);

  const editing = tasks.find((t) => t.id === editingId) ?? null;
  const statusOrder = useMemo(
    () => new Map(statusSettings.map((item) => [item.code, item.sort_order])),
    [statusSettings],
  );
  const sortedTasks = useMemo(() => {
    if (!sortKey) return tasks;
    const direction = sortDirection === "asc" ? 1 : -1;
    return [...tasks].sort((a, b) => {
      let comparison = 0;
      if (sortKey === "title") {
        comparison = a.title.localeCompare(b.title, "vi");
      } else if (sortKey === "assignee") {
        comparison = (a.primary?.full_name ?? "").localeCompare(
          b.primary?.full_name ?? "",
          "vi",
        );
      } else if (sortKey === "due_date") {
        comparison = (a.due_date ?? "9999-12-31").localeCompare(
          b.due_date ?? "9999-12-31",
        );
      } else if (sortKey === "arising") {
        comparison = Number(b.is_arising) - Number(a.is_arising);
      } else {
        comparison =
          (statusOrder.get(a.status) ?? Number.MAX_SAFE_INTEGER) -
          (statusOrder.get(b.status) ?? Number.MAX_SAFE_INTEGER);
      }
      return comparison * direction;
    });
  }, [tasks, sortKey, sortDirection, statusOrder]);

  function changeSort(key: SortKey) {
    if (sortKey === key) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  }

  function SortHeader({
    column,
    children,
  }: {
    column: SortKey;
    children: React.ReactNode;
  }) {
    const marker =
      sortKey === column ? (sortDirection === "asc" ? " ↑" : " ↓") : "";
    return (
      <button
        type="button"
        onClick={() => changeSort(column)}
        className="font-semibold uppercase tracking-wide hover:text-brand"
      >
        {children}
        {marker}
      </button>
    );
  }

  function handleToggle(task: TaskWithAssignees, checked: boolean) {
    const next: TaskWithAssignees = {
      ...task,
      completed_at: checked ? new Date().toISOString() : null,
      status: checked
        ? "hoan_thanh"
        : task.status === "hoan_thanh"
          ? "dang_lam"
          : task.status,
    };
    onTaskChange(next);
    toggleCompleteAction(task.id, checked).then((res) => {
      if (!res.ok) onTaskChange(task);
    });
  }

  async function handleDelete(task: TaskWithAssignees) {
    const accepted = await confirm({
      title: "Xóa công việc",
      message: `Công việc “${task.title}” sẽ được ẩn khỏi danh sách và báo cáo.`,
      confirmLabel: "Xóa công việc",
      danger: true,
    });
    if (!accepted) return;
    onTaskRemove(task.id);
    deleteTaskAction(task.id, task.project_id).then((res) => {
      if (!res.ok) {
        onTaskChange(task);
        setActionError(res.error);
      }
    });
  }

  function handleDuplicate(task: TaskWithAssignees) {
    duplicateTaskAction(task.id, task.project_id).then(() => router.refresh());
  }

  async function handleAdvance(task: TaskWithAssignees) {
    const last = isLastStep(task.van_hanh_step);
    const nextLabel = last
      ? "Hoàn thành"
      : (getNextStep(task.van_hanh_step)?.label ?? "");
    const accepted = await confirm({
      title: "Chuyển bước quy trình",
      message: `Chuyển “${task.title}” sang “${nextLabel}”? Deadline sẽ được tính lại theo SLA của bước mới.`,
      confirmLabel: "Chuyển bước",
    });
    if (!accepted) return;
    setActionError(null);
    advanceVanHanhStepAction(task.id).then((res) => {
      if (res.ok) router.refresh();
      else setActionError(res.error);
    });
  }

  function actionsFor(
    task: TaskWithAssignees,
    done: boolean,
  ): ActionItem[] {
    return [
      ...(task.van_hanh_step && !done
        ? [
            {
              label: isLastStep(task.van_hanh_step)
                ? "Hoàn thành"
                : "Bước tiếp theo →",
              onClick: () => handleAdvance(task),
              emphasize: true,
            } satisfies ActionItem,
          ]
        : []),
      { label: "Sửa", onClick: () => setEditingId(task.id) },
      { label: "Nhân bản", onClick: () => handleDuplicate(task) },
      {
        label: "Xóa",
        onClick: () => handleDelete(task),
        danger: true,
      },
    ];
  }

  if (tasks.length === 0) {
    return (
      <div className="empty-state">
        Không có công việc nào.
      </div>
    );
  }

  return (
    <>
      {actionError && (
        <div className="mb-3 flex items-start justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
          <span>{actionError}</span>
          <button
            type="button"
            className="font-semibold"
            onClick={() => setActionError(null)}
            aria-label="Đóng thông báo lỗi"
          >
            ×
          </button>
        </div>
      )}
      <div className="space-y-2 md:hidden">
        {sortedTasks.map((task) => {
          const overdue = isOverdue(task);
          const startLate = needsToStart(task);
          const attention = needsAttention(task);
          const done = task.status === "hoan_thanh" || !!task.completed_at;
          const canLog =
            !!workMemberId &&
            (task.primary?.id === workMemberId ||
              task.supporters.some((member) => member.id === workMemberId));
          return (
            <article
              key={task.id}
              className={`card p-4 ${
                done
                  ? "border-green-200 bg-green-50/70 dark:border-green-900 dark:bg-green-950/20"
                  : attention
                    ? "border-red-200 dark:border-red-900"
                    : ""
              }`}
            >
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={done}
                  onChange={(event) => handleToggle(task, event.target.checked)}
                  className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer accent-brand"
                  aria-label={`Đánh dấu hoàn thành ${task.title}`}
                />
                <button
                  type="button"
                  onClick={() => setEditingId(task.id)}
                  className="min-w-0 flex-1 text-left"
                >
                  <span className={`block break-words font-semibold leading-5 ${
                    done ? "text-green-700 dark:text-green-300" : ""
                  }`}>
                    {task.title}
                  </span>
                  <span className="mt-1 block text-xs text-gray-500 dark:text-gray-400">
                    {task.primary?.full_name ?? "Chưa giao"} ·{" "}
                    <span className={overdue ? "font-medium text-red-600" : ""}>
                      {formatFriendlyDate(task.due_date)}
                    </span>
                  </span>
                </button>
                <ActionsMenu
                  label={`Thao tác với ${task.title}`}
                  items={actionsFor(task, done)}
                />
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <StatusBadge
                  value={task.status}
                  setting={statusSettings.find((item) => item.code === task.status)}
                />
                {task.is_arising && <ArisingBadge />}
                {overdue && <OverdueBadge />}
                {startLate && !overdue && <NeedStartBadge />}
                {task.van_hanh_step && (
                  <StepBadge
                    order={
                      workflowSteps.findIndex(
                        (step) => step.code === task.van_hanh_step,
                      ) + 1
                    }
                    label={
                      getStep(task.van_hanh_step)?.label ?? task.van_hanh_step
                    }
                  />
                )}
              </div>

              {(task.tags.length > 0 || task.subtasks.length > 0) && (
                <div className="mt-3 border-t border-gray-100 pt-3 dark:border-gray-800">
                  {task.tags.length > 0 && <TagChips tags={task.tags} />}
                  {task.subtasks.length > 0 && (
                    <div className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                      {task.subtasks.filter((subtask) => subtask.is_done).length}/
                      {task.subtasks.length} nhiệm vụ con
                    </div>
                  )}
                </div>
              )}

              {workMemberId && canLog && (
                <label className="mt-3 flex items-center gap-2 border-t border-gray-100 pt-3 text-xs font-medium text-gray-600 dark:border-gray-800 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={workTaskIds.has(task.id)}
                    onChange={(event) =>
                      onToggleWorkLog(task.id, event.target.checked)
                    }
                    className="h-4 w-4 accent-brand"
                  />
                  Thêm vào My day
                </label>
              )}
            </article>
          );
        })}
      </div>

      <div className="card hidden overflow-x-auto md:block">
      <table className="w-full min-w-[860px] text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500 dark:border-gray-800 dark:text-gray-400">
            <th className="w-10 p-3"></th>
            {workMemberId && <th className="w-20 p-3 text-center">My day</th>}
            <th className="p-3"><SortHeader column="title">Công việc</SortHeader></th>
            <th className="p-3"><SortHeader column="assignee">Người phụ trách</SortHeader></th>
            <th className="p-3"><SortHeader column="due_date">Deadline</SortHeader></th>
            <th className="p-3">Bước</th>
            <th className="p-3"><SortHeader column="arising">Phát sinh</SortHeader></th>
            <th className="p-3"><SortHeader column="status">Trạng thái</SortHeader></th>
            <th className="p-3 text-right">Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {sortedTasks.map((t) => {
            const overdue = isOverdue(t);
            const startLate = needsToStart(t);
            const attention = needsAttention(t);
            const done = t.status === "hoan_thanh" || !!t.completed_at;
            const canLog =
              !!workMemberId &&
              (t.primary?.id === workMemberId ||
                t.supporters.some((member) => member.id === workMemberId));
            return (
              <tr
                key={t.id}
                className={`border-b border-gray-100 last:border-0 dark:border-gray-800 ${
                  done
                    ? "bg-green-50 dark:bg-green-950/30"
                    : attention
                      ? "bg-red-50 dark:bg-red-950/30"
                      : ""
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
                {workMemberId && (
                  <td className="p-3 text-center align-top">
                    {canLog ? (
                      <input
                        type="checkbox"
                        checked={workTaskIds.has(t.id)}
                        onChange={(e) => onToggleWorkLog(t.id, e.target.checked)}
                        className="h-4 w-4 cursor-pointer accent-brand"
                        aria-label="Thêm công việc vào My day"
                      />
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                )}
                <td className="p-3 align-top">
                  <div
                    className={`font-medium ${
                      done
                        ? "text-green-700 dark:text-green-300"
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
                  {t.tags.length > 0 && (
                    <div className="mt-1">
                      <TagChips tags={t.tags} />
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
                  {t.van_hanh_step ? (
                    <StepBadge
                      order={
                        workflowSteps
                          .findIndex((step) => step.code === t.van_hanh_step) + 1
                      }
                      label={getStep(t.van_hanh_step)?.label ?? t.van_hanh_step}
                    />
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </td>
                <td className="p-3 align-top">
                  {t.is_arising ? <ArisingBadge /> : <span className="text-gray-300">—</span>}
                </td>
                <td className="p-3 align-top">
                  <StatusBadge
                    value={t.status}
                    setting={statusSettings.find((item) => item.code === t.status)}
                  />
                </td>
                <td className="p-3 align-top text-right">
                  <div className="flex justify-end">
                    <ActionsMenu
                      items={actionsFor(t, done)}
                    />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      </div>

      <TaskEditModal
        task={editing}
        members={members}
        tags={tags}
        prioritySettings={prioritySettings}
        statusSettings={statusSettings}
        onClose={() => setEditingId(null)}
      />
      {confirmDialog}
    </>
  );
}
