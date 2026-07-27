"use client";

import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { TaskForm } from "./TaskForm";
import { SubtaskList } from "./SubtaskList";
import { AttachmentList } from "./AttachmentList";
import { TaskThread } from "./TaskThread";
import { updateTaskAction } from "@/lib/actions/tasks";
import type {
  MemberLite,
  Tag,
  TaskPrioritySetting,
  TaskStatusSetting,
  TaskWithAssignees,
} from "@/lib/types";

// Modal sửa công việc dùng chung cho view Danh sách và Kanban.
export function TaskEditModal({
  task,
  members,
  tags,
  prioritySettings,
  statusSettings,
  onClose,
}: {
  task: TaskWithAssignees | null;
  members: MemberLite[];
  tags?: Tag[];
  prioritySettings?: TaskPrioritySetting[];
  statusSettings?: TaskStatusSetting[];
  onClose: () => void;
}) {
  const router = useRouter();

  return (
    <Modal open={task !== null} onClose={onClose} title="Sửa công việc">
      {task && (
        <div className="space-y-5">
          <TaskForm
            task={task}
            members={members}
            tags={tags}
            prioritySettings={prioritySettings}
            statusSettings={statusSettings}
            onSubmit={(fd) => updateTaskAction(task.id, task.project_id, fd)}
            onDone={() => {
              onClose();
              router.refresh();
            }}
          />
          <div className="border-t border-gray-200 pt-4 dark:border-gray-800">
            <SubtaskList taskId={task.id} subtasks={task.subtasks} />
          </div>
          <div className="border-t border-gray-200 pt-4 dark:border-gray-800">
            <AttachmentList taskId={task.id} attachments={task.attachments} />
          </div>
          <div className="border-t border-gray-200 pt-4 dark:border-gray-800">
            <TaskThread taskId={task.id} />
          </div>
        </div>
      )}
    </Modal>
  );
}
