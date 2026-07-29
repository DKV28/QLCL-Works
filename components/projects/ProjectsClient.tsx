"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { ProjectStatusBadge } from "@/components/ui/Badges";
import { ActionsMenu } from "@/components/ui/ActionsMenu";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ProjectForm } from "./ProjectForm";
import {
  createProjectAction,
  deleteProjectAction,
  duplicateProjectAction,
  updateProjectAction,
} from "@/lib/actions/projects";
import type { Project } from "@/lib/types";

export function ProjectsClient({ projects }: { projects: Project[] }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [pendingDelete, startDelete] = useTransition();
  const { confirm, confirmDialog } = useConfirmDialog();

  function refresh() {
    setCreating(false);
    setEditing(null);
    router.refresh();
  }

  async function handleDelete(p: Project) {
    const accepted = await confirm({
      title: "Xóa dự án",
      message: `Dự án “${p.name}” và các công việc bên trong sẽ được ẩn khỏi hệ thống.`,
      confirmLabel: "Xóa dự án",
      danger: true,
    });
    if (!accepted) return;
    startDelete(async () => {
      await deleteProjectAction(p.id);
      router.refresh();
    });
  }

  async function handleDuplicate(p: Project) {
    const accepted = await confirm({
      title: "Nhân bản dự án",
      message: `Tạo một bản sao của “${p.name}” cùng toàn bộ công việc?`,
      confirmLabel: "Nhân bản",
    });
    if (!accepted) return;
    startDelete(async () => {
      await duplicateProjectAction(p.id);
      router.refresh();
    });
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dự án</h1>
          <p className="page-description">
            Tổ chức công việc theo mục tiêu, phạm vi và thời hạn.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/thu-vien-mau" className="btn-secondary">
            Thư viện mẫu
          </Link>
          <button className="btn-primary" onClick={() => setCreating(true)}>
            Tạo dự án
          </button>
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="empty-state">
          Chưa có dự án nào. Bấm &quot;Tạo dự án&quot; để bắt đầu.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <div key={p.id} className="card flex min-h-52 flex-col p-5 transition hover:border-gray-300 dark:hover:border-gray-700">
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
              <div className="flex items-center justify-between border-t border-gray-100 pt-3 dark:border-gray-800">
                <Link href={`/du-an/${p.id}`} className="text-sm font-semibold text-brand hover:underline">
                  Mở dự án
                </Link>
                <ActionsMenu
                  label={`Thao tác với ${p.name}`}
                  items={[
                    { label: "Sửa", onClick: () => setEditing(p) },
                    { label: "Nhân bản", onClick: () => handleDuplicate(p) },
                    { label: "Xóa", onClick: () => handleDelete(p), danger: true },
                  ]}
                />
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
      {confirmDialog}
    </div>
  );
}
