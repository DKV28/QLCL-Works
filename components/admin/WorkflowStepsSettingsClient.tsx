"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createWorkflowStepAction,
  deleteWorkflowStepAction,
  updateWorkflowStepAction,
  type ActionResult,
} from "@/lib/actions/settings";
import type { WorkflowStepSetting } from "@/lib/types";

function StepFields({ step }: { step?: WorkflowStepSetting }) {
  return (
    <div className="grid items-end gap-3 md:grid-cols-[minmax(180px,1fr)_minmax(150px,0.8fr)_110px_100px_auto]">
      <div>
        <label className="label">Tên bước</label>
        <input name="label" className="input" defaultValue={step?.label} required />
        {step && <p className="mt-1 text-xs text-gray-400">Mã hệ thống: <code>{step.code}</code></p>}
      </div>
      <div>
        <label className="label">Vai trò tham khảo</label>
        <input name="role_label" className="input" defaultValue={step?.role_label} placeholder="Ví dụ: P. QLCL" />
      </div>
      <div>
        <label className="label">SLA (ngày)</label>
        <input name="sla_days" type="number" min={0} max={365} className="input" defaultValue={step?.sla_days ?? 1} required />
      </div>
      <div>
        <label className="label">Thứ tự</label>
        <input name="sort_order" type="number" className="input" defaultValue={step?.sort_order ?? 100} />
      </div>
      <label className="flex h-10 items-center gap-2 text-sm">
        <input name="is_active" type="checkbox" defaultChecked={step?.is_active ?? true} className="h-4 w-4 accent-brand" />
        Bật
      </label>
    </div>
  );
}

function StepForm({
  step,
  action,
  onDelete,
}: {
  step?: WorkflowStepSetting;
  action: (formData: FormData) => Promise<ActionResult>;
  onDelete?: () => Promise<ActionResult>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await action(formData);
      if (result.ok) router.refresh();
      else setError(result.error);
    });
  }

  function remove() {
    if (!step || !onDelete || !confirm(`Xóa bước "${step.label}"?`)) return;
    setError(null);
    startTransition(async () => {
      const result = await onDelete();
      if (result.ok) router.refresh();
      else setError(result.error);
    });
  }

  return (
    <form action={submit} className="border-b border-gray-100 p-4 last:border-0 dark:border-gray-800">
      <StepFields step={step} />
      <div className="mt-3 flex items-center justify-between gap-3">
        {error ? <p className="text-sm text-red-600">{error}</p> : <span />}
        <div className="flex gap-2">
          {step && !step.is_system && (
            <button type="button" className="btn-danger text-sm" onClick={remove} disabled={pending}>Xóa</button>
          )}
          <button className={step ? "btn-secondary text-sm" : "btn-primary text-sm"} disabled={pending}>
            {pending ? "Đang lưu..." : step ? "Lưu thay đổi" : "Thêm bước"}
          </button>
        </div>
      </div>
    </form>
  );
}

export function WorkflowStepsSettingsClient({ steps }: { steps: WorkflowStepSetting[] }) {
  return (
    <section>
      <div className="mb-2">
        <h3 className="font-semibold">Các bước quy trình & SLA</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          SLA tính theo ngày làm việc khi chuyển vào bước. Bước tắt không dùng cho công việc mới nhưng vẫn giữ trên công việc cũ.
        </p>
      </div>
      <div className="card mb-3"><StepForm action={createWorkflowStepAction} /></div>
      <div className="card">
        {steps.map((step) => (
          <StepForm
            key={step.code}
            step={step}
            action={(formData) => updateWorkflowStepAction(step.code, formData)}
            onDelete={() => deleteWorkflowStepAction(step.code)}
          />
        ))}
      </div>
    </section>
  );
}
