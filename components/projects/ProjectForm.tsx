"use client";

import { useState, useTransition } from "react";
import { PROJECT_STATUS_OPTIONS, type Project } from "@/lib/types";
import type { ActionResult } from "@/lib/actions/projects";

export function ProjectForm({
  project,
  onSubmit,
  onDone,
}: {
  project?: Project;
  onSubmit: (formData: FormData) => Promise<ActionResult>;
  onDone: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleAction(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await onSubmit(formData);
      if (res.ok) onDone();
      else setError(res.error);
    });
  }

  return (
    <form action={handleAction} className="space-y-4">
      <div>
        <label className="label" htmlFor="name">
          Tên dự án <span className="text-red-500">*</span>
        </label>
        <input
          id="name"
          name="name"
          required
          defaultValue={project?.name}
          className="input"
          placeholder="Ví dụ: Đánh giá chất lượng Quý III"
        />
      </div>

      <div>
        <label className="label" htmlFor="description">
          Mô tả
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          defaultValue={project?.description ?? ""}
          className="input"
        />
      </div>

      <div>
        <label className="label" htmlFor="status">
          Trạng thái
        </label>
        <select
          id="status"
          name="status"
          defaultValue={project?.status ?? "dang_thuc_hien"}
          className="input"
        >
          {PROJECT_STATUS_OPTIONS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          className="btn-secondary"
          onClick={onDone}
          disabled={pending}
        >
          Hủy
        </button>
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? "Đang lưu..." : "Lưu"}
        </button>
      </div>
    </form>
  );
}
