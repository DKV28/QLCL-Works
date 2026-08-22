"use client";

import { useState } from "react";
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { ArisingBadge, OverdueBadge } from "@/components/ui/Badges";
import { TagChips } from "@/components/ui/TagChips";
import { TaskEditModal } from "./TaskEditModal";
import { toggleCompleteAction } from "@/lib/actions/tasks";
import { isOverdue, needsAttention } from "@/lib/logic/overdue";
import { formatFriendlyDate } from "@/lib/logic/dates";
import type {
  MemberLite,
  Tag,
  TaskPrioritySetting,
  TaskWithAssignees,
} from "@/lib/types";

// Kanban rút gọn: chỉ hai cột theo tình trạng hoàn thành.
type ColumnKey = "todo" | "done";

const COLUMNS: { key: ColumnKey; label: string }[] = [
  { key: "todo", label: "Chưa hoàn thành" },
  { key: "done", label: "Hoàn thành" },
];

function isDone(task: TaskWithAssignees): boolean {
  return task.status === "hoan_thanh" || !!task.completed_at;
}

function KanbanCard({
  task,
  projectName,
  workMemberId,
  worked,
  onToggleWorkLog,
  onEdit,
}: {
  task: TaskWithAssignees;
  projectName?: string;
  workMemberId: string;
  worked: boolean;
  onToggleWorkLog: (taskId: string, enabled: boolean) => void;
  onEdit: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: task.id });

  const overdue = isOverdue(task);
  const attention = needsAttention(task);
  const done = isDone(task);
  const canLog =
    !!workMemberId &&
    (task.primary?.id === workMemberId ||
      task.supporters.some((member) => member.id === workMemberId));

  return (
    <div
      ref={setNodeRef}
      onClick={() => onEdit(task.id)}
      style={{
        transform: transform
          ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
          : undefined,
        opacity: isDragging ? 0.5 : 1,
      }}
      className={`rounded-lg border p-3 text-sm transition hover:border-gray-300 hover:shadow-sm dark:hover:border-gray-700 ${
        done
          ? "border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-950/30"
          : attention
            ? "border-red-400 bg-white dark:border-red-800 dark:bg-gray-900"
            : "border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
      }`}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          {projectName && (
            <div className="truncate text-[11px] font-semibold text-gray-400 dark:text-gray-500">
              {projectName}
            </div>
          )}
        </div>
        <button
          type="button"
          {...listeners}
          {...attributes}
          onClick={(event) => event.stopPropagation()}
          className="flex h-7 w-7 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-600 active:cursor-grabbing dark:hover:bg-gray-800 dark:hover:text-gray-200"
          aria-label={`Kéo để di chuyển ${task.title}`}
          title="Kéo để đổi tình trạng hoàn thành"
        >
          <svg viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4" aria-hidden="true">
            <circle cx="5" cy="4" r="1" /><circle cx="11" cy="4" r="1" />
            <circle cx="5" cy="8" r="1" /><circle cx="11" cy="8" r="1" />
            <circle cx="5" cy="12" r="1" /><circle cx="11" cy="12" r="1" />
          </svg>
        </button>
      </div>
      {canLog && (
        <label
          className="mb-2 flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
        >
          <input
            type="checkbox"
            checked={worked}
            onChange={(event) => onToggleWorkLog(task.id, event.target.checked)}
            className="h-4 w-4 accent-brand"
          />
          My day
        </label>
      )}
      <div className="mb-1 font-semibold leading-5 text-gray-900 dark:text-gray-100">
        {task.title}
      </div>
      {task.tags.length > 0 && (
        <div className="mb-1">
          <TagChips tags={task.tags} />
        </div>
      )}
      <div className="flex flex-wrap items-center gap-1.5">
        {task.is_arising && <ArisingBadge />}
        {overdue && <OverdueBadge />}
        {task.subtaskTotal > 0 && (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {task.subtaskDone}/{task.subtaskTotal} việc con
          </span>
        )}
      </div>
      <div className="mt-1 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <span>
          {task.primary?.full_name ?? "Chưa giao"}
          {task.supporters.length > 0 && ` +${task.supporters.length}`}
        </span>
        {task.due_date && (
          <span className={overdue ? "text-red-600" : ""}>
            {formatFriendlyDate(task.due_date)}
          </span>
        )}
      </div>
    </div>
  );
}

function KanbanColumn({
  columnKey,
  label,
  tasks,
  projectNameOf,
  workMemberId,
  workTaskIds,
  onToggleWorkLog,
  onEdit,
}: {
  columnKey: ColumnKey;
  label: string;
  tasks: TaskWithAssignees[];
  projectNameOf: (id: string) => string | undefined;
  workMemberId: string;
  workTaskIds: Set<string>;
  onToggleWorkLog: (taskId: string, enabled: boolean) => void;
  onEdit: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: columnKey });

  return (
    <div className="flex min-w-[280px] flex-1 snap-start flex-col">
      <div className="mb-2 flex items-center justify-between px-1">
        <h3 className="text-sm font-semibold">{label}</h3>
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400">
          {tasks.length}
        </span>
      </div>
      <div
        ref={setNodeRef}
        className={`flex min-h-40 flex-1 flex-col gap-2 rounded-xl border p-2 transition-colors ${
          isOver
            ? "border-brand bg-brand/5"
            : "border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-950/40"
        }`}
      >
        {tasks.map((t) => (
          <KanbanCard
            key={t.id}
            task={t}
            projectName={t.project_id ? projectNameOf(t.project_id) : undefined}
            workMemberId={workMemberId}
            worked={workTaskIds.has(t.id)}
            onToggleWorkLog={onToggleWorkLog}
            onEdit={onEdit}
          />
        ))}
        {tasks.length === 0 && (
          <div className="py-6 text-center text-xs text-gray-400">
            Kéo công việc vào đây
          </div>
        )}
      </div>
    </div>
  );
}

export function KanbanBoard({
  tasks,
  members,
  projects,
  tags,
  prioritySettings,
  onTaskChange,
  workMemberId,
  workTaskIds,
  onToggleWorkLog,
}: {
  tasks: TaskWithAssignees[];
  members: MemberLite[];
  projects: { id: string; name: string }[];
  tags: Tag[];
  prioritySettings: TaskPrioritySetting[];
  onTaskChange: (task: TaskWithAssignees) => void;
  workMemberId: string;
  workTaskIds: Set<string>;
  onToggleWorkLog: (taskId: string, enabled: boolean) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const editing = tasks.find((t) => t.id === editingId) ?? null;

  const projectNameOf = (id: string) =>
    projects.find((p) => p.id === id)?.name;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const taskId = String(event.active.id);
    const target = event.over?.id as ColumnKey | undefined;
    if (!target) return;

    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    const completed = target === "done";
    if (isDone(task) === completed) return;

    // Cập nhật lạc quan: thẻ di chuyển ngay, không chờ mạng.
    onTaskChange({
      ...task,
      completed_at: completed ? new Date().toISOString() : null,
      status: completed
        ? "hoan_thanh"
        : task.status === "hoan_thanh"
          ? "dang_lam"
          : task.status,
    });

    toggleCompleteAction(taskId, completed).then((res) => {
      if (!res.ok) onTaskChange(task);
    });
  }

  return (
    <>
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3">
          {COLUMNS.map((column) => (
            <KanbanColumn
              key={column.key}
              columnKey={column.key}
              label={column.label}
              tasks={tasks.filter((t) =>
                column.key === "done" ? isDone(t) : !isDone(t),
              )}
              projectNameOf={projectNameOf}
              workMemberId={workMemberId}
              workTaskIds={workTaskIds}
              onToggleWorkLog={onToggleWorkLog}
              onEdit={setEditingId}
            />
          ))}
        </div>
      </DndContext>

      <TaskEditModal
        task={editing}
        members={members}
        tags={tags}
        prioritySettings={prioritySettings}
        onClose={() => setEditingId(null)}
      />
    </>
  );
}
