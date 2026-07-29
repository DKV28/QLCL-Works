"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createPrioritySettingAction,
  createStatusSettingAction,
  deletePrioritySettingAction,
  deleteStatusSettingAction,
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
  isSystem,
  onSubmit,
  onDelete,
}: {
  code: string;
  label: string;
  color: string;
  sortOrder: number;
  active: boolean;
  isDefault: boolean;
  lockedNote?: string;
  isSystem: boolean;
  onSubmit: (formData: FormData) => Promise<Result>;
  onDelete: () => Promise<Result>;
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

  function remove() {
    if (!confirm(`Xóa mục "${label}"?`)) return;
    setError(null);
    startTransition(async () => {
      const result = await onDelete();
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
        <div className="flex gap-2">
          {!isSystem && (
            <button
              type="button"
              className="btn-danger text-sm"
              disabled={pending}
              onClick={remove}
            >
              Xóa
            </button>
          )}
          <button className="btn-secondary text-sm" disabled={pending}>
            {pending ? "Đang lưu..." : "Lưu thay đổi"}
          </button>
        </div>
      </div>
    </form>
  );
}

function NewSettingForm({
  kind,
}: {
  kind: "priority" | "status";
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const action =
    kind === "priority"
      ? createPrioritySettingAction
      : createStatusSettingAction;

  function submit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await action(formData);
      if (result.ok) router.refresh();
      else setError(result.error);
    });
  }

  return (
    <form action={submit} className="card mb-3 p-4">
      <div className="grid items-end gap-3 md:grid-cols-[1fr_110px_100px_auto_auto]">
        <div>
          <label className="label">Tên hiển thị mới</label>
          <input name="label" className="input" required placeholder="Nhập tên..." />
        </div>
        <div>
          <label className="label">Màu</label>
          <input
            name="color"
            type="color"
            defaultValue={kind === "priority" ? "#6366f1" : "#0ea5e9"}
            className="h-10 w-full cursor-pointer rounded-md border border-gray-300 bg-white p-1 dark:border-gray-700 dark:bg-gray-900"
          />
        </div>
        <div>
          <label className="label">Thứ tự</label>
          <input name="sort_order" type="number" className="input" defaultValue={40} />
        </div>
        <label className="flex h-10 items-center gap-2 text-sm">
          <input name="is_active" type="checkbox" defaultChecked className="h-4 w-4 accent-brand" />
          Bật
        </label>
        <button className="btn-primary" disabled={pending}>
          {pending ? "Đang thêm..." : "Thêm mới"}
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
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
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Tùy chỉnh tên, màu, thứ tự hiển thị và giá trị mặc định. Mã hệ thống
          được giữ cố định để bảo toàn dữ liệu và hành vi Kanban.
        </p>
      </div>

      <section>
        <h3 className="mb-2 font-semibold">Mức độ quan trọng</h3>
        <NewSettingForm kind="priority" />
        <div className="card">
          {priorities.map((item) => (
            <SettingRow
              key={item.code}
              code={item.code}
              label={item.label}
              color={item.color}
              sortOrder={item.sort_order}
              active={item.is_active}
              isDefault={item.is_default}
              isSystem={item.is_system}
              onSubmit={(formData) =>
                updatePrioritySettingAction(item.code, formData)
              }
              onDelete={() => deletePrioritySettingAction(item.code)}
            />
          ))}
        </div>
      </section>

      <section>
        <h3 className="mb-2 font-semibold">Trạng thái</h3>
        <NewSettingForm kind="status" />
        <div className="card">
          {statuses.map((item) => (
            <SettingRow
              key={item.code}
              code={item.code}
              label={item.label}
              color={item.color}
              sortOrder={item.sort_order}
              active={item.is_active}
              isDefault={item.is_default}
              isSystem={item.is_system}
              lockedNote={item.is_terminal ? "Trạng thái hoàn tất" : undefined}
              onSubmit={(formData) =>
                updateStatusSettingAction(item.code, formData)
              }
              onDelete={() => deleteStatusSettingAction(item.code)}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
