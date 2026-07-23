"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { ProjectStatusBadge } from "@/components/ui/Badges";
import { ProjectForm } from "./ProjectForm";
import {
  createProjectAction,
  deleteProjectAction,
  updateProjectAction,
} from "@/lib/actions/projects";
import type { Project } from "@/lib/types";

export function ProjectsClient({ projects }: { projects: Project[] }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [pendingDelete, startDelete] = useTransition();

  function refresh() {
    setCreating(false);
    setEditing(null);
    router.refresh();
  }

  function handleDelete(p: Project) {
    if (!confirm(`Xóa dự án "${p.name}"? Công việc bên trong cũng sẽ bị ẩn.`))
      return;
    startDelete(async () => {
      await deleteProjectAction(p.id);
      router.refresh();
    });
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dự án</h1>
        <button className="btn-primary" onClick={() => setCreating(true)}>
          Tạo dự án
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="card p-10 text-center text-gray-500 dark:text-gray-400">
          Chưa có dự án nào. Bấm &quot;Tạo dự án&quot; để bắt đầu.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <div key={p.id} className="card flex flex-col p-5">
              <div className="mb-2 flex items-start justify-between gap-2">
                <Link
                  href={`/du-an/${p.id}`}
                  className="text-lg font-semibold text-brand hover:underline"
                >
                  {p.name}
                </Link>
                <ProjectStatusBadge value={p.status} />
              </div>
              <p className="mb-4 flex-1 text-sm text-gray-600 line-clamp-3 dark:text-gray-400">
                {p.description || "—"}
              </p>
              <div className="flex justify-end gap-2">
                <button
                  className="btn-secondary text-xs"
                  onClick={() => setEditing(p)}
                >
                  Sửa
                </button>
                <button
                  className="btn-danger text-xs"
                  onClick={() => handleDelete(p)}
                  disabled={pendingDelete}
                >
                  Xóa
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title="Tạo dự án mới"
      >
        <ProjectForm onSubmit={createProjectAction} onDone={refresh} />
      </Modal>

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title="Sửa dự án"
      >
        {editing && (
          <ProjectForm
            project={editing}
            onSubmit={(fd) => updateProjectAction(editing.id, fd)}
            onDone={refresh}
          />
        )}
      </Modal>
    </div>
  );
}
