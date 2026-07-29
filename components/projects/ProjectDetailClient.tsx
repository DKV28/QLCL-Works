"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Modal } from "@/components/ui/Modal";
import { ProjectStatusBadge } from "@/components/ui/Badges";
import { TaskForm } from "@/components/tasks/TaskForm";
import { TaskTable } from "@/components/tasks/TaskTable";
import { createTaskAction } from "@/lib/actions/tasks";
import type {
  MemberLite,
  Project,
  Tag,
  TaskPrioritySetting,
  TaskStatusSetting,
  TaskWithAssignees,
} from "@/lib/types";

export function ProjectDetailClient({
  project,
  tasks,
  members,
  tags,
  prioritySettings,
  statusSettings,
}: {
  project: Project;
  tasks: TaskWithAssignees[];
  members: MemberLite[];
  tags: Tag[];
  prioritySettings: TaskPrioritySetting[];
  statusSettings: TaskStatusSetting[];
}) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [localTasks, setLocalTasks] = useState(tasks);
  useEffect(() => setLocalTasks(tasks), [tasks]);

  function replaceTask(next: TaskWithAssignees) {
    setLocalTasks((current) =>
      current.some((task) => task.id === next.id)
        ? current.map((task) => (task.id === next.id ? next : task))
        : [...current, next],
    );
  }

  return (
    <div>
      <div className="mb-3">
        <Link href="/du-an" className="text-sm text-brand hover:underline">
          ← Dự án
        </Link>
      </div>

      <div className="page-header">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="page-title">{project.name}</h1>
            <ProjectStatusBadge value={project.status} />
          </div>
          {project.description && (
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              {project.description}
            </p>
          )}
        </div>
        <button className="btn-primary shrink-0" onClick={() => setCreating(true)}>
          <span className="text-lg leading-none">+</span>
          Công việc
        </button>
      </div>

      <TaskTable
        tasks={localTasks}
        members={members}
        tags={tags}
        prioritySettings={prioritySettings}
        statusSettings={statusSettings}
        onTaskChange={replaceTask}
        onTaskRemove={(id) =>
          setLocalTasks((current) => current.filter((task) => task.id !== id))
        }
      />

      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title="Thêm công việc"
      >
        <TaskForm
          members={members}
          tags={tags}
          prioritySettings={prioritySettings}
          statusSettings={statusSettings}
          onSubmit={(fd) => createTaskAction(project.id, fd)}
          onDone={() => {
            setCreating(false);
            router.refresh();
          }}
        />
      </Modal>
    </div>
  );
}
