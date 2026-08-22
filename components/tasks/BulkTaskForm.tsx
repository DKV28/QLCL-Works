"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { createTasksBulkAction } from "@/lib/actions/tasks";
import { parseBulkTasks } from "@/lib/logic/bulk-tasks";
import { todayISO } from "@/lib/logic/overdue";
import { formatFriendlyDate } from "@/lib/logic/dates";
import type { MemberLite, Project, Tag } from "@/lib/types";

// Nhập hàng loạt: dán nhiều dòng -> mỗi dòng một công việc.
export function BulkTaskForm({
  members,
  projects,
  tags,
  defaultProjectId,
  onDone,
}: {
  members: MemberLite[];
  projects?: Pick<Project, "id" | "name">[];
  tags?: Tag[];
  defaultProjectId?: string | null;
  onDone: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [text, setText] = useState("");

  const defaultYear = Number(todayISO().slice(0, 4));
  const parsed = useMemo(
    () => parseBulkTasks(text, defaultYear),
    [text, defaultYear],
  );

  // Nhóm nhân sự theo team để chọn người phụ trách chính.
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
      const res = await createTasksBulkAction(formData);
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
        <label className="label" htmlFor="lines">
          Danh sách công việc <span className="text-red-500">*</span>
        </label>
        <textarea
          id="lines"
          name="lines"
          rows={8}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={
            "Mỗi dòng là một công việc, ví dụ:\n" +
            "Rà soát hồ sơ khoa Nội\n" +
            "Cập nhật quy trình QT.06 | 25/09\n" +
            "Họp giao ban tuần @28/09/2026"
          }
          className="input font-mono text-sm"
        />
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Mẹo: thêm deadline riêng cho từng dòng bằng “<code>| 25/09</code>” hoặc
          “<code>@25/09/2026</code>”. Dòng không ghi thì dùng deadline chung bên dưới.
          Ký hiệu đầu dòng (-, *, 1.) sẽ được tự bỏ.
        </p>
      </div>

      <div>
        <label className="label" htmlFor="primary_member_id">
          Người phụ trách chính <span className="text-red-500">*</span>
        </label>
        <select
          id="primary_member_id"
          name="primary_member_id"
          required
          defaultValue=""
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

      {!projects && defaultProjectId && (
        <input type="hidden" name="project_id" value={defaultProjectId} />
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label" htmlFor="due_date">
            Deadline chung <span className="text-gray-400">(tùy chọn)</span>
          </label>
          <input
            id="due_date"
            name="due_date"
            type="date"
            className="input"
          />
        </div>
        {projects && (
          <div>
            <label className="label" htmlFor="project_id">
              Dự án <span className="text-gray-400">(tùy chọn)</span>
            </label>
            <select
              id="project_id"
              name="project_id"
              defaultValue={defaultProjectId ?? ""}
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

      {tags && tags.length > 0 && (
        <div>
          <label className="label">Nhãn (áp dụng cho cả loạt)</label>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <label
                key={tag.id}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs"
                style={{ borderColor: tag.color, color: tag.color }}
              >
                <input
                  type="checkbox"
                  name="tag_ids"
                  value={tag.id}
                  className="h-3 w-3"
                  style={{ accentColor: tag.color }}
                />
                {tag.name}
              </label>
            ))}
          </div>
        </div>
      )}

      {parsed.length > 0 && (
        <div className="rounded-md border border-gray-200 dark:border-gray-700">
          <div className="border-b border-gray-200 px-3 py-2 text-sm font-medium dark:border-gray-700">
            Xem trước: {parsed.length} công việc
          </div>
          <ul className="max-h-48 divide-y divide-gray-100 overflow-y-auto text-sm dark:divide-gray-800">
            {parsed.map((line, index) => (
              <li
                key={index}
                className="flex items-center justify-between gap-3 px-3 py-1.5"
              >
                <span className="min-w-0 flex-1 truncate">{line.title}</span>
                {line.dueDate ? (
                  <span className="shrink-0 text-xs text-brand">
                    {formatFriendlyDate(line.dueDate)}
                  </span>
                ) : (
                  <span className="shrink-0 text-xs text-gray-400">
                    deadline chung
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

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
        <button
          type="submit"
          className="btn-primary"
          disabled={pending || parsed.length === 0}
        >
          {pending
            ? "Đang tạo..."
            : `Tạo ${parsed.length > 0 ? parsed.length : ""} công việc`}
        </button>
      </div>
    </form>
  );
}
