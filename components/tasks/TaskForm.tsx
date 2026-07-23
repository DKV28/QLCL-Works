"use client";

import { useState, useTransition } from "react";
import {
  TASK_PRIORITY_OPTIONS,
  TASK_STATUS_OPTIONS,
  type Profile,
  type Project,
  type TaskWithAssignees,
} from "@/lib/types";
import type { ActionResult } from "@/lib/actions/tasks";

export function TaskForm({
  task,
  assignees,
  projects,
  onSubmit,
  onDone,
}: {
  task?: TaskWithAssignees;
  assignees: Pick<Profile, "id" | "full_name" | "email">[];
  // Khi truyền vào (từ trang Danh sách tổng), form hiện ô chọn dự án.
  projects?: Pick<Project, "id" | "name">[];
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

  const currentAssignee = task?.assignees[0]?.id ?? "";

  return (
    <form action={handleAction} className="space-y-4">
      {projects && (
        <div>
          <label className="label" htmlFor="project_id">
            Dự án <span className="text-red-500">*</span>
          </label>
          <select
            id="project_id"
            name="project_id"
            required
            defaultValue={task?.project_id ?? ""}
            className="input"
          >
            <option value="">— Chọn dự án —</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="label" htmlFor="title">
          Tên công việc <span className="text-red-500">*</span>
        </label>
        <input
          id="title"
          name="title"
          required
          defaultValue={task?.title}
          className="input"
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
          defaultValue={task?.description ?? ""}
          className="input"
        />
      </div>

      <div>
        <label className="label" htmlFor="assignee_id">
          Người phụ trách
        </label>
        <select
          id="assignee_id"
          name="assignee_id"
          defaultValue={currentAssignee}
          className="input"
        >
          <option value="">— Chưa giao —</option>
          {assignees.map((a) => (
            <option key={a.id} value={a.id}>
              {a.full_name || a.email}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label" htmlFor="start_date">
            Ngày bắt đầu
          </label>
          <input
            id="start_date"
            name="start_date"
            type="date"
            defaultValue={task?.start_date ?? ""}
            className="input"
          />
        </div>
        <div>
          <label className="label" htmlFor="due_date">
            Deadline
          </label>
          <input
            id="due_date"
            name="due_date"
            type="date"
            defaultValue={task?.due_date ?? ""}
            className="input"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label" htmlFor="priority">
            Mức độ quan trọng
          </label>
          <select
            id="priority"
            name="priority"
            defaultValue={task?.priority ?? "trung_binh"}
            className="input"
          >
            {TASK_PRIORITY_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="status">
            Trạng thái
          </label>
          <select
            id="status"
            name="status"
            defaultValue={task?.status ?? "chua_bat_dau"}
            className="input"
          >
            {TASK_STATUS_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
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
