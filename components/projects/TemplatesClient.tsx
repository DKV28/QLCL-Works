"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ActionsMenu } from "@/components/ui/ActionsMenu";
import { ProjectForm } from "./ProjectForm";
import {
  createFromTemplateAction,
  createProjectAction,
  deleteProjectAction,
} from "@/lib/actions/projects";
import type { Project } from "@/lib/types";

export function TemplatesClient({ templates }: { templates: Project[] }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [pending, startTransition] = useTransition();
  const { confirm, confirmDialog } = useConfirmDialog();

  function refresh() {
    setCreating(false);
    router.refresh();
  }

  async function useTemplate(p: Project) {
    const accepted = await confirm({
      title: "Tạo dự án từ mẫu",
      message: `Tạo dự án mới cùng toàn bộ công việc trong mẫu “${p.name}”?`,
      confirmLabel: "Tạo dự án",
    });
    if (!accepted) return;
    startTransition(async () => {
      await createFromTemplateAction(p.id);
      router.refresh();
    });
  }

  async function remove(p: Project) {
    const accepted = await confirm({
      title: "Xóa mẫu",
      message: `Mẫu “${p.name}” sẽ không còn xuất hiện trong thư viện.`,
      confirmLabel: "Xóa mẫu",
      danger: true,
    });
    if (!accepted) return;
    startTransition(async () => {
      await deleteProjectAction(p.id);
      router.refresh();
    });
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
          <h1 className="page-title">Thư viện mẫu</h1>
          <p className="page-description">
            Chuẩn hóa các checklist thường dùng để khởi tạo dự án nhanh hơn.
          </p>
        </div>
        <button className="btn-primary" onClick={() => setCreating(true)}>
          <span className="text-lg leading-none">+</span>
          Mẫu mới
        </button>
      </div>

      {templates.length === 0 ? (
        <div className="empty-state">
          Chưa có mẫu nào. Bấm &quot;Tạo mẫu mới&quot;, hoặc mở một dự án và đánh
          dấu &quot;Đây là dự án mẫu&quot;.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((p) => (
            <div key={p.id} className="card flex min-h-48 flex-col p-5 transition hover:border-gray-300 dark:hover:border-gray-700">
              <div className="mb-2 text-lg font-semibold">{p.name}</div>
              <p className="mb-4 flex-1 text-sm text-gray-600 line-clamp-3 dark:text-gray-400">
                {p.description || "Chưa có mô tả"}
              </p>
              <div className="flex items-center justify-between border-t border-gray-100 pt-3 dark:border-gray-800">
                <button
                  className="text-sm font-semibold text-brand hover:underline"
                  onClick={() => useTemplate(p)}
                  disabled={pending}
                >
                  Sử dụng mẫu
                </button>
                <ActionsMenu
                  label={`Thao tác với mẫu ${p.name}`}
                  items={[
                    {
                      label: "Chỉnh sửa mẫu",
                      onClick: () => router.push(`/du-an/${p.id}`),
                    },
                    { label: "Xóa mẫu", onClick: () => remove(p), danger: true },
                  ]}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={creating} onClose={() => setCreating(false)} title="Tạo mẫu mới">
        <ProjectForm
          defaultTemplate
          onSubmit={createProjectAction}
          onDone={refresh}
        />
      </Modal>
      {confirmDialog}
    </div>
  );
}
