"use client";

import { useState } from "react";
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
import { OverdueBadge, PriorityBadge } from "@/components/ui/Badges";
import { TaskEditModal } from "./TaskEditModal";
import { updateTaskStatusAction } from "@/lib/actions/tasks";
import { isOverdue } from "@/lib/logic/overdue";
import {
  TASK_STATUS_LABEL,
  TASK_STATUS_OPTIONS,
  type MemberLite,
  type TaskStatus,
  type TaskWithAssignees,
} from "@/lib/types";

function KanbanCard({
  task,
  onEdit,
}: {
  task: TaskWithAssignees;
  onEdit: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: task.id });

  const overdue = isOverdue(task);

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
        overdue
          ? "border-red-300 dark:border-red-900"
          : "border-gray-200 dark:border-gray-800"
      }`}
    >
      <div className="mb-1 font-medium text-gray-900 dark:text-gray-100">
        {task.title}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <PriorityBadge value={task.priority} />
        {overdue && <OverdueBadge />}
        {task.subtasks.length > 0 && (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {task.subtasks.filter((s) => s.is_done).length}/
            {task.subtasks.length} việc con
          </span>
        )}
      </div>
      {task.primary && (
        <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {task.primary.full_name}
          {task.supporters.length > 0 && ` +${task.supporters.length}`}
        </div>
      )}
    </div>
  );
}

function KanbanColumn({
  status,
  tasks,
  onEdit,
}: {
  status: TaskStatus;
  tasks: TaskWithAssignees[];
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
          <KanbanCard key={t.id} task={t} onEdit={onEdit} />
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
}: {
  tasks: TaskWithAssignees[];
  members: MemberLite[];
}) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const editing = tasks.find((t) => t.id === editingId) ?? null;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const taskId = String(event.active.id);
    const newStatus = event.over?.id as TaskStatus | undefined;
    if (!newStatus) return;

    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === newStatus) return;

    // Cập nhật lạc quan qua server rồi refresh.
    updateTaskStatusAction(taskId, newStatus).then(() => router.refresh());
  }

  return (
    <>
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-2">
          {TASK_STATUS_OPTIONS.map(([status]) => (
            <KanbanColumn
              key={status}
              status={status}
              tasks={tasks.filter((t) => t.status === status)}
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
