"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArisingBadge,
  OverdueBadge,
  StepBadge,
} from "@/components/ui/Badges";
import { TaskEditModal } from "./TaskEditModal";
import {
  advanceVanHanhStepAction,
  deleteTaskAction,
  duplicateTaskAction,
  toggleCompleteAction,
} from "@/lib/actions/tasks";
import {
  VAN_HANH_STEPS,
  workflowStepColorForRole,
} from "@/lib/logic/van-hanh";
import { getWorkflowStepsAction } from "@/lib/actions/settings";
import { ActionsMenu, type ActionItem } from "@/components/ui/ActionsMenu";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";
import { TagChips } from "@/components/ui/TagChips";
import { isOverdue, needsAttention, todayISO } from "@/lib/logic/overdue";
import { formatFriendlyDate } from "@/lib/logic/dates";
import type {
  MemberLite,
  Tag,
  TaskPrioritySetting,
  TaskWithAssignees,
  WorkflowStepSetting,
} from "@/lib/types";

type SortKey = "title" | "assignee" | "due_date" | "arising";
type SortDirection = "asc" | "desc";
type TaskGroup = {
  id: "today" | "upcoming" | "completed";
  label: string;
  helper: string;
  dotClass: string;
  tasks: TaskWithAssignees[];
};

export function TaskTable({
  tasks,
  members,
  tags,
  prioritySettings,
  onTaskChange,
  onTaskRemove,
  workMemberId = "",
  workTaskIds = new Set<string>(),
  onToggleWorkLog = () => {},
  openTaskId,
}: {
  tasks: TaskWithAssignees[];
  members: MemberLite[];
  tags: Tag[];
  prioritySettings: TaskPrioritySetting[];
  onTaskChange: (task: TaskWithAssignees) => void;
  onTaskRemove: (id: string) => void;
  workMemberId?: string;
  workTaskIds?: Set<string>;
  onToggleWorkLog?: (taskId: string, enabled: boolean) => void;
  openTaskId?: string;
}) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [actionError, setActionError] = useState<string | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<TaskGroup["id"]>>(
    new Set(),
  );
  const { confirm, confirmDialog } = useConfirmDialog();
  const [workflowSteps, setWorkflowSteps] = useState<WorkflowStepSetting[]>(
    VAN_HANH_STEPS.map((step) => ({
      code: step.code,
      label: step.label,
      role_label: step.role,
      color: workflowStepColorForRole(step.role),
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

  useEffect(() => {
    if (openTaskId && tasks.some((task) => task.id === openTaskId)) {
      setEditingId(openTaskId);
    }
  }, [openTaskId, tasks]);

  function closeEditor() {
    setEditingId(null);
    if (openTaskId) router.replace("/cong-viec", { scroll: false });
  }

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
      } else {
        comparison = Number(b.is_arising) - Number(a.is_arising);
      }
      return comparison * direction;
    });
  }, [tasks, sortKey, sortDirection]);
  const taskGroups = useMemo(() => {
    const today = todayISO();
    const groups: TaskGroup[] = [
      {
        id: "today",
        label: "Hôm nay",
        helper: "Đã tới hoặc quá deadline",
        dotClass: "bg-orange-500",
        tasks: [],
      },
      {
        id: "upcoming",
        label: "Sắp tới",
        helper: "Chưa tới deadline",
        dotClass: "bg-blue-500",
        tasks: [],
      },
      {
        id: "completed",
        label: "Hoàn thành",
        helper: "Đã kết thúc",
        dotClass: "bg-emerald-500",
        tasks: [],
      },
    ];

    for (const task of sortedTasks) {
      const done = task.status === "hoan_thanh" || !!task.completed_at;
      if (done) {
        groups[2].tasks.push(task);
      } else if (task.due_date !== null && task.due_date <= today) {
        groups[0].tasks.push(task);
      } else {
        groups[1].tasks.push(task);
      }
    }
    return groups.filter((group) => group.tasks.length > 0);
  }, [sortedTasks]);

  function changeSort(key: SortKey) {
    if (sortKey === key) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  }

  function toggleGroup(groupId: TaskGroup["id"]) {
    setCollapsedGroups((current) => {
      const next = new Set(current);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  }

  function GroupChevron({ collapsed }: { collapsed: boolean }) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`h-4 w-4 transition-transform ${collapsed ? "-rotate-90" : ""}`}
        aria-hidden="true"
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    );
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
      <div className="space-y-5 md:hidden">
        {taskGroups.map((group) => (
          <section key={group.id}>
            <button
              type="button"
              onClick={() => toggleGroup(group.id)}
              className="mb-2 flex w-full items-center gap-2 rounded-md px-1 py-1 text-left transition hover:bg-gray-100 dark:hover:bg-gray-800"
              aria-expanded={!collapsedGroups.has(group.id)}
            >
              <span className={`h-2.5 w-2.5 rounded-full ${group.dotClass}`} />
              <h2 className="text-sm font-semibold">{group.label}</h2>
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-500 dark:bg-gray-800 dark:text-gray-300">
                {group.tasks.length}
              </span>
              <span className="ml-auto hidden text-[11px] text-gray-400 sm:inline">
                {group.helper}
              </span>
              <GroupChevron collapsed={collapsedGroups.has(group.id)} />
            </button>
            {!collapsedGroups.has(group.id) && <div className="space-y-2">
        {group.tasks.map((task) => {
          const overdue = isOverdue(task);
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
                {task.is_arising && <ArisingBadge />}
                {overdue && <OverdueBadge />}
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
                    color={
                      getStep(task.van_hanh_step)?.color ||
                      workflowStepColorForRole(
                        getStep(task.van_hanh_step)?.role_label ?? "",
                      )
                    }
                  />
                )}
              </div>

              {(task.tags.length > 0 || task.subtaskTotal > 0) && (
                <div className="mt-3 border-t border-gray-100 pt-3 dark:border-gray-800">
                  {task.tags.length > 0 && <TagChips tags={task.tags} />}
                  {task.subtaskTotal > 0 && (
                    <div className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                      {task.subtaskDone}/{task.subtaskTotal} nhiệm vụ con
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
            </div>}
          </section>
        ))}
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
            <th className="p-3 text-right">Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {taskGroups.map((group) => (
            <Fragment key={group.id}>
              <tr className="border-y border-gray-100 bg-gray-50/90 dark:border-gray-800 dark:bg-gray-950/45">
                <td
                  colSpan={workMemberId ? 8 : 7}
                  className="px-3 py-2"
                >
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.id)}
                    className="flex w-full items-center gap-2 text-left"
                    aria-expanded={!collapsedGroups.has(group.id)}
                  >
                    <span className={`h-2.5 w-2.5 rounded-full ${group.dotClass}`} />
                    <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                      {group.label}
                    </span>
                    <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-gray-500 shadow-sm dark:bg-gray-800 dark:text-gray-300">
                      {group.tasks.length}
                    </span>
                    <span className="text-[11px] text-gray-400">
                      {group.helper}
                    </span>
                    <GroupChevron collapsed={collapsedGroups.has(group.id)} />
                  </button>
                </td>
              </tr>
          {!collapsedGroups.has(group.id) && group.tasks.map((t) => {
            const overdue = isOverdue(t);
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
                  editingId === t.id
                    ? "bg-brand/5 shadow-[inset_3px_0_0_var(--tw-shadow-color)] shadow-brand"
                    : done
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
                <td className="p-0 align-top">
                  <button
                    type="button"
                    onClick={() => setEditingId(t.id)}
                    aria-label={`Chỉnh sửa công việc ${t.title}`}
                    aria-expanded={editingId === t.id}
                    className="block w-full p-3 text-left outline-none transition hover:bg-brand/[0.035] focus-visible:bg-brand/[0.06] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/40"
                  >
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
                    {t.subtaskTotal > 0 && (
                      <span>
                        Nhiệm vụ con: {t.subtaskDone}/{t.subtaskTotal}
                      </span>
                    )}
                    {t.attachmentCount > 0 && (
                      <span>{t.attachmentCount} tệp đính kèm</span>
                    )}
                  </div>
                  </button>
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
                      color={
                        getStep(t.van_hanh_step)?.color ||
                        workflowStepColorForRole(
                          getStep(t.van_hanh_step)?.role_label ?? "",
                        )
                      }
                    />
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </td>
                <td className="p-3 align-top">
                  {t.is_arising ? <ArisingBadge /> : <span className="text-gray-300">—</span>}
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
            </Fragment>
          ))}
        </tbody>
      </table>

      </div>

      <TaskEditModal
        task={editing}
        members={members}
        tags={tags}
        prioritySettings={prioritySettings}
        onClose={closeEditor}
      />
      {confirmDialog}
    </>
  );
}
