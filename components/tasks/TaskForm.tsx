"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  TASK_PRIORITY_OPTIONS,
  TASK_REPEAT_OPTIONS,
  TASK_STATUS_OPTIONS,
  type MemberLite,
  type Project,
  type Tag,
  type TaskPrioritySetting,
  type TaskStatusSetting,
  type TaskWithAssignees,
} from "@/lib/types";
import type { ActionResult } from "@/lib/actions/tasks";
import { getTagsAction } from "@/lib/actions/tags";
import { todayISO } from "@/lib/logic/overdue";

export function TaskForm({
  task,
  members,
  projects,
  tags,
  prioritySettings,
  statusSettings,
  onSubmit,
  onDone,
}: {
  task?: TaskWithAssignees;
  members: MemberLite[];
  // Khi truyền vào (từ trang Danh sách tổng), form hiện ô chọn dự án.
  projects?: Pick<Project, "id" | "name">[];
  tags?: Tag[];
  prioritySettings?: TaskPrioritySetting[];
  statusSettings?: TaskStatusSetting[];
  onSubmit: (formData: FormData) => Promise<ActionResult>;
  onDone: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [primaryId, setPrimaryId] = useState(task?.primary?.id ?? "");
  const [allTags, setAllTags] = useState<Tag[]>(tags ?? []);

  useEffect(() => {
    if (!tags) getTagsAction().then(setAllTags);
  }, [tags]);

  const priorityOptions =
    prioritySettings && prioritySettings.length > 0
      ? prioritySettings.filter((item) => item.is_active || item.code === task?.priority)
      : TASK_PRIORITY_OPTIONS.map(([code, label], index) => ({
          code,
          label,
          color: "",
          sort_order: index,
          is_active: true,
          is_default: code === "trung_binh",
          updated_at: "",
        }));
  const statusOptions =
    statusSettings && statusSettings.length > 0
      ? statusSettings.filter((item) => item.is_active || item.code === task?.status)
      : TASK_STATUS_OPTIONS.map(([code, label], index) => ({
          code,
          label,
          color: "",
          sort_order: index,
          is_active: true,
          is_default: code === "chua_bat_dau",
          is_terminal: code === "hoan_thanh",
          updated_at: "",
        }));
  const defaultPriority =
    priorityOptions.find((item) => item.is_default)?.code ?? "trung_binh";
  const defaultStatus =
    statusOptions.find((item) => item.is_default)?.code ?? "chua_bat_dau";

  const initialTagIds = useMemo(
    () => new Set((task?.tags ?? []).map((t) => t.id)),
    [task],
  );

  const initialSupporters = useMemo(
    () => new Set((task?.supporters ?? []).map((s) => s.id)),
    [task],
  );

  // Nhóm nhân sự theo team (members đã được sắp theo team rồi tên).
  const groups = useMemo(() => {
    const map = new Map<string, MemberLite[]>();
    for (const m of members) {
      const key = m.team_name ?? "Chưa phân nhóm";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(m);
    }
    return Array.from(map.entries());
  }, [members]);

  function handleAction(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await onSubmit(formData);
      if (res.ok) onDone();
      else setError(res.error);
    });
  }

  if (members.length === 0) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Chưa có nhân sự nào trong danh sách. Hãy thêm nhân sự trước khi giao việc.
        </p>
        <div className="flex justify-end">
          <Link href="/quan-tri/nhan-su" className="btn-primary">
            Tới trang Nhân sự
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form action={handleAction} className="space-y-4">
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
        <label className="label" htmlFor="primary_member_id">
          Người phụ trách chính <span className="text-red-500">*</span>
        </label>
        <select
          id="primary_member_id"
          name="primary_member_id"
          required
          value={primaryId}
          onChange={(e) => setPrimaryId(e.target.value)}
          className="input"
        >
          <option value="">— Chọn người phụ trách chính —</option>
          {groups.map(([team, ms]) => (
            <optgroup key={team} label={team}>
              {ms.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.full_name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      <div>
        <label className="label">Người hỗ trợ</label>
        <div className="max-h-52 overflow-y-auto rounded-md border border-gray-300 p-2 dark:border-gray-700">
          {groups.map(([team, ms]) => (
            <div key={team} className="mb-2 last:mb-0">
              <div className="px-1 py-1 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                {team}
              </div>
              {ms.map((m) => (
                <label
                  key={m.id}
                  className={`flex items-center gap-2 rounded px-1 py-1 text-sm ${
                    m.id === primaryId
                      ? "text-gray-400 dark:text-gray-600"
                      : "text-gray-700 dark:text-gray-200"
                  }`}
                >
                  <input
                    type="checkbox"
                    name="support_member_ids"
                    value={m.id}
                    defaultChecked={initialSupporters.has(m.id)}
                    disabled={m.id === primaryId}
                    className="h-4 w-4 accent-brand"
                  />
                  {m.full_name}
                  {m.id === primaryId && (
                    <span className="text-xs">(phụ trách chính)</span>
                  )}
                </label>
              ))}
            </div>
          ))}
        </div>
      </div>

      {allTags.length > 0 && (
        <div>
          <label className="label">Nhãn</label>
          <div className="flex flex-wrap gap-2">
            {allTags.map((tag) => (
              <label
                key={tag.id}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs"
                style={{ borderColor: tag.color, color: tag.color }}
              >
                <input
                  type="checkbox"
                  name="tag_ids"
                  value={tag.id}
                  defaultChecked={initialTagIds.has(tag.id)}
                  className="h-3 w-3"
                  style={{ accentColor: tag.color }}
                />
                {tag.name}
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label" htmlFor="start_date">
            Ngày bắt đầu
          </label>
          <input
            id="start_date"
            name="start_date"
            type="date"
            defaultValue={task ? task.start_date ?? "" : todayISO()}
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
            defaultValue={task?.priority ?? defaultPriority}
            className="input"
          >
            {priorityOptions.map((item) => (
              <option key={item.code} value={item.code}>
                {item.label}
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
            defaultValue={task?.status ?? defaultStatus}
            className="input"
          >
            {statusOptions.map((item) => (
              <option key={item.code} value={item.code}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label" htmlFor="repeat">
            Lặp lại
          </label>
          <select
            id="repeat"
            name="repeat"
            defaultValue={task?.repeat ?? "none"}
            className="input"
          >
            {TASK_REPEAT_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        {projects && (
          <div>
            <label className="label" htmlFor="project_id">
              Dự án <span className="text-gray-400">(tùy chọn)</span>
            </label>
            <select
              id="project_id"
              name="project_id"
              defaultValue={task?.project_id ?? ""}
              className="input"
            >
              <option value="">— Không thuộc dự án —</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
        <input
          type="checkbox"
          name="is_arising"
          defaultChecked={task?.is_arising ?? false}
          className="h-4 w-4 accent-brand"
        />
        Công việc phát sinh (ngoài kế hoạch)
      </label>

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
