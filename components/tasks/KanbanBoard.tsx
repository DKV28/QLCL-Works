"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  NeedStartBadge,
  OverdueBadge,
  PriorityBadge,
} from "@/components/ui/Badges";
import { TaskEditModal } from "./TaskEditModal";
import { updateTaskStatusAction } from "@/lib/actions/tasks";
import { isOverdue, needsAttention, needsToStart } from "@/lib/logic/overdue";
import { formatFriendlyDate } from "@/lib/logic/dates";
import {
  TASK_STATUS_LABEL,
  TASK_STATUS_OPTIONS,
  type MemberLite,
  type TaskStatus,
  type TaskWithAssignees,
} from "@/lib/types";

function KanbanCard({
  task,
  projectName,
  onEdit,
}: {
  task: TaskWithAssignees;
  projectName?: string;
  onEdit: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: task.id });

  const overdue = isOverdue(task);
  const startLate = needsToStart(task);
  const attention = needsAttention(task);

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={() => onEdit(task.id)}
      style={{
        transform: transform
          ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
          : undefined,
        opacity: isDragging ? 0.5 : 1,
      }}
      className={`cursor-grab touch-none rounded-md border bg-white p-3 text-sm shadow-sm active:cursor-grabbing dark:bg-gray-900 ${
        attention
          ? "border-red-400 dark:border-red-800"
          : "border-gray-200 dark:border-gray-800"
      }`}
    >
      {projectName && (
        <div className="mb-1 truncate text-[11px] font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
          {projectName}
        </div>
      )}
      <div className="mb-1 font-medium text-gray-900 dark:text-gray-100">
        {task.title}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <PriorityBadge value={task.priority} />
        {overdue && <OverdueBadge />}
        {startLate && !overdue && <NeedStartBadge />}
        {task.subtasks.length > 0 && (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {task.subtasks.filter((s) => s.is_done).length}/
            {task.subtasks.length} việc con
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
  status,
  tasks,
  projectNameOf,
  onEdit,
}: {
  status: TaskStatus;
  tasks: TaskWithAssignees[];
  projectNameOf: (id: string) => string | undefined;
  onEdit: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div className="flex min-w-[260px] flex-1 flex-col">
      <div className="mb-2 flex items-center gap-2 px-1">
        <h3 className="text-sm font-semibold">{TASK_STATUS_LABEL[status]}</h3>
        <span className="text-xs text-gray-400">{tasks.length}</span>
      </div>
      <div
        ref={setNodeRef}
        className={`flex flex-1 flex-col gap-2 rounded-lg border p-2 transition-colors ${
          isOver
            ? "border-brand bg-brand/5"
            : "border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-950/40"
        }`}
      >
        {tasks.map((t) => (
          <KanbanCard
            key={t.id}
            task={t}
            projectName={projectNameOf(t.project_id)}
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
}: {
  tasks: TaskWithAssignees[];
  members: MemberLite[];
  projects: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);

  // Bản sao cục bộ để cập nhật lạc quan khi kéo thả (phản hồi tức thì).
  const [localTasks, setLocalTasks] = useState(tasks);
  useEffect(() => setLocalTasks(tasks), [tasks]);

  const editing = localTasks.find((t) => t.id === editingId) ?? null;

  const projectNameOf = (id: string) =>
    projects.find((p) => p.id === id)?.name;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const taskId = String(event.active.id);
    const newStatus = event.over?.id as TaskStatus | undefined;
    if (!newStatus) return;

    const task = localTasks.find((t) => t.id === taskId);
    if (!task || task.status === newStatus) return;

    // Cập nhật lạc quan: thẻ di chuyển ngay, không chờ mạng.
    setLocalTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              status: newStatus,
              completed_at:
                newStatus === "hoan_thanh"
                  ? new Date().toISOString()
                  : null,
            }
          : t,
      ),
    );

    updateTaskStatusAction(taskId, newStatus).then((res) => {
      if (!res.ok) {
        setLocalTasks(tasks); // lỗi -> khôi phục
        return;
      }
      router.refresh(); // đồng bộ ngầm cho các view khác
    });
  }

  return (
    <>
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-2">
          {TASK_STATUS_OPTIONS.map(([status]) => (
            <KanbanColumn
              key={status}
              status={status}
              tasks={localTasks.filter((t) => t.status === status)}
              projectNameOf={projectNameOf}
              onEdit={setEditingId}
            />
          ))}
        </div>
      </DndContext>

      <TaskEditModal
        task={editing}
        members={members}
        onClose={() => setEditingId(null)}
      />
    </>
  );
}
