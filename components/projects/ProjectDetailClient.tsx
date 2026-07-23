"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Modal } from "@/components/ui/Modal";
import { ProjectStatusBadge } from "@/components/ui/Badges";
import { TaskForm } from "@/components/tasks/TaskForm";
import { TaskTable } from "@/components/tasks/TaskTable";
import { createTaskAction } from "@/lib/actions/tasks";
import type { MemberLite, Project, TaskWithAssignees } from "@/lib/types";

export function ProjectDetailClient({
  project,
  tasks,
  members,
}: {
  project: Project;
  tasks: TaskWithAssignees[];
  members: MemberLite[];
}) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);

  return (
    <div>
      <div className="mb-2">
        <Link href="/du-an" className="text-sm text-brand hover:underline">
          Quay lại danh sách dự án
        </Link>
      </div>

      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{project.name}</h1>
            <ProjectStatusBadge value={project.status} />
          </div>
          {project.description && (
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              {project.description}
            </p>
          )}
        </div>
        <button className="btn-primary shrink-0" onClick={() => setCreating(true)}>
          Thêm công việc
        </button>
      </div>

      <TaskTable tasks={tasks} members={members} />

      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title="Thêm công việc"
      >
        <TaskForm
          members={members}
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
