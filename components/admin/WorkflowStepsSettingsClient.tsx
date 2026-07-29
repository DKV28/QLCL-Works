"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import {
  createWorkflowStepAction,
  deleteWorkflowStepAction,
  updateWorkflowStepAction,
  type ActionResult,
} from "@/lib/actions/settings";
import type { WorkflowStepSetting } from "@/lib/types";

function StepFields({ step }: { step?: WorkflowStepSetting }) {
  return (
    <div className="grid items-end gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(180px,1fr)_minmax(150px,0.8fr)_110px_100px_auto]">
      <div>
        <label className="label">Tên bước</label>
        <input name="label" className="input" defaultValue={step?.label} required />
        {step && (
          <p className="mt-1 text-xs text-gray-400">
            Mã hệ thống: <code>{step.code}</code>
          </p>
        )}
      </div>
      <div>
        <label className="label">Vai trò tham khảo</label>
        <input
          name="role_label"
          className="input"
          defaultValue={step?.role_label}
          placeholder="Ví dụ: P. QLCL"
        />
      </div>
      <div>
        <label className="label">SLA (ngày)</label>
        <input
          name="sla_days"
          type="number"
          min={0}
          max={365}
          className="input"
          defaultValue={step?.sla_days ?? 1}
          required
        />
      </div>
      <div>
        <label className="label">Thứ tự</label>
        <input
          name="sort_order"
          type="number"
          className="input"
          defaultValue={step?.sort_order ?? 100}
        />
      </div>
      <label className="flex h-10 items-center gap-2 text-sm">
        <input
          name="is_active"
          type="checkbox"
          defaultChecked={step?.is_active ?? true}
          className="h-4 w-4 accent-brand"
        />
        Đang bật
      </label>
    </div>
  );
}

function StepForm({
  step,
  action,
  onDelete,
  onSuccess,
}: {
  step?: WorkflowStepSetting;
  action: (formData: FormData) => Promise<ActionResult>;
  onDelete?: () => Promise<ActionResult>;
  onSuccess?: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await action(formData);
      if (result.ok) {
        onSuccess?.();
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  function remove() {
    if (!step || !onDelete || !confirm(`Xóa bước "${step.label}"?`)) return;
    setError(null);
    startTransition(async () => {
      const result = await onDelete();
      if (result.ok) {
        onSuccess?.();
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <form action={submit} className="space-y-3">
      <StepFields step={step} />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex justify-end gap-2">
        {step && !step.is_system && (
          <button
            type="button"
            className="btn-danger text-sm"
            onClick={remove}
            disabled={pending}
          >
            Xóa bước
          </button>
        )}
        <button className="btn-primary text-sm" disabled={pending}>
          {pending ? "Đang lưu..." : step ? "Lưu thay đổi" : "Thêm bước"}
        </button>
      </div>
    </form>
  );
}

export function WorkflowStepsSettingsClient({
  steps,
}: {
  steps: WorkflowStepSetting[];
}) {
  const [creating, setCreating] = useState(false);
  const [editingCode, setEditingCode] = useState<string | null>(null);

  return (
    <div>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Các bước quy trình & SLA</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            SLA được tính theo ngày làm việc khi công việc chuyển vào bước.
            Bước đã tắt vẫn được giữ trên các công việc cũ.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand text-xl font-medium leading-none text-white hover:opacity-90"
          aria-label="Thêm bước quy trình"
          title="Thêm bước quy trình"
        >
          +
        </button>
      </div>

      <div className="mb-3 flex flex-wrap gap-2 text-xs text-gray-500 dark:text-gray-400">
        <span className="rounded-full bg-gray-100 px-2.5 py-1 dark:bg-gray-800">
          {steps.length} bước
        </span>
        <span className="rounded-full bg-green-50 px-2.5 py-1 text-green-700 dark:bg-green-950/40 dark:text-green-400">
          {steps.filter((step) => step.is_active).length} đang bật
        </span>
      </div>

      <div className="space-y-2">
        {steps.map((step, index) => {
          const editing = editingCode === step.code;
          return (
            <div key={step.code} className="card overflow-hidden">
              <div className="grid items-center gap-3 p-3 sm:grid-cols-[44px_minmax(180px,1.3fr)_minmax(130px,0.8fr)_90px_90px_auto]">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <div className="truncate font-medium">{step.label}</div>
                  <div className="truncate text-xs text-gray-400">{step.code}</div>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  <span className="mr-1 text-xs text-gray-400 sm:hidden">Vai trò:</span>
                  {step.role_label || "—"}
                </div>
                <div className="text-sm">
                  <span className="mr-1 text-xs text-gray-400 sm:hidden">SLA:</span>
                  <span className="font-semibold">{step.sla_days}</span>{" "}
                  <span className="text-xs text-gray-400">ngày</span>
                </div>
                <span
                  className={`w-fit rounded-full px-2 py-1 text-xs font-medium ${
                    step.is_active
                      ? "bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-400"
                      : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                  }`}
                >
                  {step.is_active ? "Đang bật" : "Đã tắt"}
                </span>
                <button
                  type="button"
                  className="btn-secondary justify-self-start text-sm sm:justify-self-end"
                  onClick={() => setEditingCode(editing ? null : step.code)}
                  aria-expanded={editing}
                >
                  {editing ? "Thu gọn" : "Sửa"}
                </button>
              </div>

              {editing && (
                <div className="border-t border-gray-100 bg-gray-50/50 p-4 dark:border-gray-800 dark:bg-gray-950/20">
                  <StepForm
                    step={step}
                    action={(formData) =>
                      updateWorkflowStepAction(step.code, formData)
                    }
                    onDelete={() => deleteWorkflowStepAction(step.code)}
                    onSuccess={() => setEditingCode(null)}
                  />
                </div>
              )}
            </div>
          );
        })}
        {steps.length === 0 && (
          <div className="card p-8 text-center text-sm text-gray-400">
            Chưa có bước quy trình nào.
          </div>
        )}
      </div>

      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title="Thêm bước quy trình"
      >
        <StepForm
          action={createWorkflowStepAction}
          onSuccess={() => setCreating(false)}
        />
      </Modal>
    </div>
  );
}
