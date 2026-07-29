"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
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

  function refresh() {
    setCreating(false);
    router.refresh();
  }

  function useTemplate(p: Project) {
    if (!confirm(`Tạo dự án mới từ mẫu "${p.name}"?`)) return;
    startTransition(async () => {
      await createFromTemplateAction(p.id);
      router.refresh();
    });
  }

  function remove(p: Project) {
    if (!confirm(`Xóa mẫu "${p.name}"?`)) return;
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
                {p.description || "—"}
              </p>
              <div className="flex justify-end gap-2">
                <button
                  className="btn-primary text-xs"
                  onClick={() => useTemplate(p)}
                  disabled={pending}
                >
                  Tạo dự án từ mẫu
                </button>
                <Link href={`/du-an/${p.id}`} className="btn-secondary text-xs">
                  Sửa
                </Link>
                <button
                  className="btn-danger text-xs"
                  onClick={() => remove(p)}
                  disabled={pending}
                >
                  Xóa
                </button>
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
    </div>
  );
}
