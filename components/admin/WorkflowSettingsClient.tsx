"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import {
  createStatusSettingAction,
  deleteStatusSettingAction,
  updateStatusSettingAction,
} from "@/lib/actions/settings";
import type { TaskStatusSetting } from "@/lib/types";

type Result = { ok: true } | { ok: false; error: string };

function StatusForm({
  status,
  action,
  onDelete,
  onDone,
}: {
  status?: TaskStatusSetting;
  action: (formData: FormData) => Promise<Result>;
  onDelete?: () => Promise<Result>;
  onDone: () => void;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await action(formData);
      if (result.ok) {
        onDone();
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  function remove() {
    if (!status || !onDelete) return;
    setError(null);
    startTransition(async () => {
      const result = await onDelete();
      if (result.ok) {
        onDone();
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <form action={submit} className="space-y-4">
      <div>
        <label className="label">Tên hiển thị</label>
        <input
          name="label"
          className="input"
          defaultValue={status?.label}
          placeholder="Ví dụ: Chờ phản hồi"
          required
        />
        {status && (
          <p className="mt-1 text-xs text-gray-400">
            Mã hệ thống: <code>{status.code}</code>
            {status.is_terminal ? " · Trạng thái hoàn tất" : ""}
          </p>
        )}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Màu hiển thị</label>
          <div className="flex items-center gap-3">
            <input
              name="color"
              type="color"
              defaultValue={status?.color ?? "#0ea5e9"}
              className="h-10 w-14 cursor-pointer rounded-lg border border-gray-200 bg-white p-1 dark:border-gray-700 dark:bg-gray-900"
            />
            <span className="text-xs text-gray-500">Dùng cho badge và cột Kanban</span>
          </div>
        </div>
        <div>
          <label className="label">Thứ tự hiển thị</label>
          <input
            name="sort_order"
            type="number"
            className="input"
            defaultValue={status?.sort_order ?? 40}
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-5">
        <label className="flex items-center gap-2 text-sm">
          <input
            name="is_active"
            type="checkbox"
            defaultChecked={status?.is_active ?? true}
            className="h-4 w-4 accent-brand"
          />
          Đang bật
        </label>
        <label className="flex items-center gap-2 text-sm">
          {status?.is_default && (
            <input type="hidden" name="is_default" value="on" />
          )}
          <input
            name="is_default"
            type="checkbox"
            defaultChecked={status?.is_default ?? false}
            disabled={status?.is_default}
            className="h-4 w-4 accent-brand"
          />
          Trạng thái mặc định
        </label>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {confirmingDelete && status && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
          Xóa “{status.label}”? Chỉ trạng thái chưa được sử dụng mới có thể xóa.
        </div>
      )}

      <div className="flex justify-end gap-2 pt-1">
        {status && !status.is_system && !confirmingDelete && (
          <button
            type="button"
            className="btn-danger"
            disabled={pending}
            onClick={() => setConfirmingDelete(true)}
          >
            Xóa trạng thái
          </button>
        )}
        {confirmingDelete && (
          <>
            <button
              type="button"
              className="btn-secondary"
              disabled={pending}
              onClick={() => setConfirmingDelete(false)}
            >
              Hủy
            </button>
            <button
              type="button"
              className="btn-danger"
              disabled={pending}
              onClick={remove}
            >
              {pending ? "Đang xóa..." : "Xác nhận xóa"}
            </button>
          </>
        )}
        <button className="btn-primary" disabled={pending}>
          {pending ? "Đang lưu..." : status ? "Lưu thay đổi" : "Thêm trạng thái"}
        </button>
      </div>
    </form>
  );
}

export function WorkflowSettingsClient({
  statuses,
}: {
  statuses: TaskStatusSetting[];
}) {
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<TaskStatusSetting | null>(null);

  return (
    <div>
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Trạng thái công việc</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Quản lý tên, màu và thứ tự hiển thị trên danh sách và Kanban.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand text-xl font-medium leading-none text-white hover:bg-brand-dark"
          aria-label="Thêm trạng thái"
          title="Thêm trạng thái"
        >
          +
        </button>
      </div>

      <div className="space-y-2">
        {statuses.map((status) => (
          <div
            key={status.code}
            className="card grid items-center gap-3 p-4 sm:grid-cols-[minmax(180px,1fr)_100px_100px_auto]"
          >
            <div className="flex min-w-0 items-center gap-3">
              <span
                className="h-3 w-3 shrink-0 rounded-full"
                style={{ backgroundColor: status.color }}
              />
              <div className="min-w-0">
                <div className="truncate font-semibold">{status.label}</div>
                <div className="truncate text-xs text-gray-400">{status.code}</div>
              </div>
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Thứ tự {status.sort_order}
            </div>
            <div className="flex flex-wrap gap-1.5">
              <span className={`rounded-full px-2 py-1 text-xs font-medium ${
                status.is_active
                  ? "bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-400"
                  : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
              }`}>
                {status.is_active ? "Đang bật" : "Đã tắt"}
              </span>
              {status.is_default && (
                <span className="rounded-full bg-brand/10 px-2 py-1 text-xs font-medium text-brand dark:text-brand-light">
                  Mặc định
                </span>
              )}
            </div>
            <button
              className="btn-secondary justify-self-start text-sm sm:justify-self-end"
              onClick={() => setEditing(status)}
            >
              Sửa
            </button>
          </div>
        ))}
        {statuses.length === 0 && (
          <div className="empty-state">Chưa có trạng thái nào.</div>
        )}
      </div>

      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title="Thêm trạng thái"
      >
        <StatusForm
          action={createStatusSettingAction}
          onDone={() => setCreating(false)}
        />
      </Modal>

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title="Chỉnh sửa trạng thái"
      >
        {editing && (
          <StatusForm
            status={editing}
            action={(formData) =>
              updateStatusSettingAction(editing.code, formData)
            }
            onDelete={() => deleteStatusSettingAction(editing.code)}
            onDone={() => setEditing(null)}
          />
        )}
      </Modal>
    </div>
  );
}
