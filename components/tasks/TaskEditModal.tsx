"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { TaskForm } from "./TaskForm";
import { SubtaskList } from "./SubtaskList";
import { FollowupDialog } from "./FollowupDialog";
import { AttachmentList } from "./AttachmentList";
import { TaskThread } from "./TaskThread";
import { updateTaskAction } from "@/lib/actions/tasks";
import type {
  MemberLite,
  Tag,
  TaskPrioritySetting,
  TaskWithAssignees,
} from "@/lib/types";

// Panel sửa công việc dùng chung cho các view. Panel không khóa cuộn hoặc phủ mờ
// nội dung để người dùng vẫn đối chiếu được công việc với danh sách bên dưới.
export function TaskEditModal({
  task,
  members,
  tags,
  prioritySettings,
  onClose,
}: {
  task: TaskWithAssignees | null;
  members: MemberLite[];
  tags?: Tag[];
  prioritySettings?: TaskPrioritySetting[];
  onClose: () => void;
}) {
  const router = useRouter();
  const titleId = useId();
  const panelRef = useRef<HTMLElement>(null);
  const [followupOpen, setFollowupOpen] = useState(false);

  useEffect(() => {
    if (!task) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    const frame = window.requestAnimationFrame(() => panelRef.current?.focus());
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.cancelAnimationFrame(frame);
    };
  }, [task, onClose]);

  if (!task) return null;

  return (
    <aside
      ref={panelRef}
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
      tabIndex={-1}
      className="fixed inset-y-0 right-0 z-40 flex w-full flex-col border-l border-gray-200 bg-white shadow-[-12px_0_32px_rgba(15,23,42,0.12)] outline-none sm:w-[min(520px,42vw)] dark:border-gray-700 dark:bg-gray-900 dark:shadow-[-12px_0_32px_rgba(0,0,0,0.35)]"
    >
      <div className="flex shrink-0 items-start justify-between gap-4 border-b border-gray-100 px-5 py-4 dark:border-gray-800">
        <div className="min-w-0">
          <p className="text-xs font-medium text-brand dark:text-brand-light">Chi tiết công việc</p>
          <h2 id={titleId} className="mt-0.5 truncate text-base font-semibold" title={task.title}>
            {task.title}
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand/40 dark:hover:bg-gray-800 dark:hover:text-gray-100"
          aria-label="Đóng cột chỉnh sửa"
          title="Đóng (Esc)"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5" aria-hidden="true">
            <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
          </svg>
        </button>
      </div>
      <div className="flex-1 overflow-y-auto overscroll-contain p-5">
        <div key={task.id} className="space-y-5">
          <TaskForm
            task={task}
            members={members}
            tags={tags}
            prioritySettings={prioritySettings}
            onSubmit={(fd) => updateTaskAction(task.id, task.project_id, fd)}
            onDone={() => {
              onClose();
              router.refresh();
            }}
          />
          <div className="border-t border-gray-200 pt-4 dark:border-gray-800">
            <SubtaskList taskId={task.id} />
            <button
              type="button"
              onClick={() => setFollowupOpen(true)}
              className="btn-secondary mt-3"
            >
              Tạo đề xuất theo dõi
            </button>
          </div>
          <div className="border-t border-gray-200 pt-4 dark:border-gray-800">
            <AttachmentList taskId={task.id} />
          </div>
          <div className="border-t border-gray-200 pt-4 dark:border-gray-800">
            <TaskThread taskId={task.id} />
          </div>
        </div>
      </div>
      {followupOpen && (
        <FollowupDialog
          task={task}
          members={members}
          onClose={() => setFollowupOpen(false)}
        />
      )}
    </aside>
  );
}
