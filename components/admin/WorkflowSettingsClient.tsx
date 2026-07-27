"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  updatePrioritySettingAction,
  updateStatusSettingAction,
} from "@/lib/actions/settings";
import type {
  TaskPrioritySetting,
  TaskStatusSetting,
} from "@/lib/types";

type Result = { ok: true } | { ok: false; error: string };

function SettingRow({
  code,
  label,
  color,
  sortOrder,
  active,
  isDefault,
  lockedNote,
  onSubmit,
}: {
  code: string;
  label: string;
  color: string;
  sortOrder: number;
  active: boolean;
  isDefault: boolean;
  lockedNote?: string;
  onSubmit: (formData: FormData) => Promise<Result>;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await onSubmit(formData);
      if (result.ok) router.refresh();
      else setError(result.error);
    });
  }

  return (
    <form action={submit} className="border-b border-gray-100 p-4 last:border-0 dark:border-gray-800">
      <div className="grid items-end gap-3 md:grid-cols-[1fr_110px_100px_auto_auto]">
        <div>
          <label className="label" htmlFor={`${code}-label`}>
            Tên hiển thị
          </label>
          <input
            id={`${code}-label`}
            name="label"
            className="input"
            defaultValue={label}
            required
          />
          <p className="mt-1 text-xs text-gray-400">
            Mã hệ thống: <code>{code}</code>
            {lockedNote ? ` · ${lockedNote}` : ""}
          </p>
        </div>
        <div>
          <label className="label" htmlFor={`${code}-color`}>
            Màu
          </label>
          <input
            id={`${code}-color`}
            name="color"
            type="color"
            className="h-10 w-full cursor-pointer rounded-md border border-gray-300 bg-white p-1 dark:border-gray-700 dark:bg-gray-900"
            defaultValue={color}
          />
        </div>
        <div>
          <label className="label" htmlFor={`${code}-order`}>
            Thứ tự
          </label>
          <input
            id={`${code}-order`}
            name="sort_order"
            type="number"
            className="input"
            defaultValue={sortOrder}
          />
        </div>
        <label className="flex h-10 items-center gap-2 text-sm">
          <input
            name="is_active"
            type="checkbox"
            defaultChecked={active}
            className="h-4 w-4 accent-brand"
          />
          Bật
        </label>
        <label className="flex h-10 items-center gap-2 text-sm">
          {isDefault && <input type="hidden" name="is_default" value="on" />}
          <input
            name="is_default"
            type="checkbox"
            defaultChecked={isDefault}
            disabled={isDefault}
            className="h-4 w-4 accent-brand"
          />
          Mặc định
        </label>
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        {error ? <p className="text-sm text-red-600">{error}</p> : <span />}
        <button className="btn-secondary text-sm" disabled={pending}>
          {pending ? "Đang lưu..." : "Lưu thay đổi"}
        </button>
      </div>
    </form>
  );
}

export function WorkflowSettingsClient({
  priorities,
  statuses,
}: {
  priorities: TaskPrioritySetting[];
  statuses: TaskStatusSetting[];
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Quy trình công việc</h2>
        …24414 tokens truncated…eteTask(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("tasks")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

interface DuplicateSrc extends Task {
  task_assignees: { member_id: string; is_primary: boolean }[] | null;
  subtasks: { title: string; sort_order: number }[] | null;
  task_tags: { tag_id: string }[] | null;
}

/**
 * Nhân bản công việc: sao chép trường + người phụ trách + nhiệm vụ con
 * (KHÔNG sao chép tệp đính kèm). Trạng thái đặt lại "chưa bắt đầu".
 * targetProjectId: nếu truyền (nhân bản dự án) thì đưa vào dự án mới và
 * giữ nguyên tên; nếu không thì thêm hậu tố "(bản sao)".
 */
export async function duplicateTask(
  taskId: string,
  targetProjectId?: string,
): Promise<Task> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("tasks")
    .select(
      "*, task_assignees ( member_id, is_primary ), subtasks ( title, sort_order ), task_tags ( tag_id )",
    )
    .eq("id", taskId)
    .single();
  if (error) throw error;
  const src = data as unknown as DuplicateSrc;

  const { data: created, error: e2 } = await supabase
    .from("tasks")
    .insert({
      project_id: targetProjectId ?? src.project_id,
      title: targetProjectId ? src.title : `${src.title} (bản sao)`,
      description: src.description,
      start_date: src.start_date,
      due_date: src.due_date,
      priority: src.priority,
      status: "chua_bat_dau",
      completed_at: null,
    })
    .select("*")
    .single();
  if (e2) throw e2;
  const newTask = created as Task;

  const assignees = (src.task_assignees ?? []).map((a) => ({
    task_id: newTask.id,
    member_id: a.member_id,
    is_primary: a.is_primary,
  }));
  if (assignees.length) await supabase.from("task_assignees").insert(assignees);

  const subs = (src.subtasks ?? []).map((st) => ({
    task_id: newTask.id,
    title: st.title,
    sort_order: st.sort_order,
    is_done: false,
  }));
  if (subs.length) await supabase.from("subtasks").insert(subs);

  const tagRows = (src.task_tags ?? []).map((tt) => ({
    task_id: newTask.id,
    tag_id: tt.tag_id,
  }));
  if (tagRows.length) await supabase.from("task_tags").insert(tagRows);

  return newTask;
}

/**
 * Gán người phụ trách: xóa hết bản ghi cũ rồi thêm mới —
 * 1 dòng phụ trách chính (is_primary) + N dòng hỗ trợ (loại trùng primary).
 */
async function setAssignees(
  taskId: string,
  primaryId: string | null,
  supportIds: string[],
): Promise<void> {
  const supabase = createClient();
  await supabase.from("task_assignees").delete().eq("task_id", taskId);

  const rows: { task_id: string; member_id: string; is_primary: boolean }[] = [];
  if (primaryId) {
    rows.push({ task_id: taskId, member_id: primaryId, is_primary: true });
  }
  for (const sid of supportIds) {
    if (sid && sid !== primaryId) {
      rows.push({ task_id: taskId, member_id: sid, is_primary: false });
    }
  }

  if (rows.length > 0) {
    const { error } = await supabase.from("task_assignees").insert(rows);
    if (error) throw error;
  }
}
