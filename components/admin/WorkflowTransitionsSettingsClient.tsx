"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import {
  createWorkflowTransitionAction,
  deleteWorkflowTransitionAction,
  updateWorkflowTransitionAction,
  type ActionResult,
} from "@/lib/actions/settings";
import type {
  WorkflowStepSetting,
  WorkflowTransition,
  WorkflowTransitionKind,
} from "@/lib/types";

const KIND_LABEL: Record<WorkflowTransitionKind, string> = {
  forward: "Tiếp tục",
  reject: "Từ chối",
  back: "Quay lại",
};

const KIND_STYLE: Record<WorkflowTransitionKind, string> = {
  forward:
    "bg-brand/10 text-brand dark:bg-brand/20",
  reject:
    "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400",
  back:
    "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
};

function TransitionFields({
  steps,
  transition,
  fromCode,
}: {
  steps: WorkflowStepSetting[];
  transition?: WorkflowTransition;
  fromCode: string;
}) {
  return (
    <div className="grid items-end gap-3 sm:grid-cols-2">
      <input type="hidden" name="from_code" value={fromCode} />
      <div className="sm:col-span-2">
        <label className="label">Chuyển sang bước</label>
        <select
          name="to_code"
          className="input"
          defaultValue={transition?.to_code ?? ""}
          required
        >
          <option value="" disabled>
            — Chọn bước đích —
          </option>
          {steps
            .filter((s) => s.code !== fromCode)
            .map((s) => (
              <option key={s.code} value={s.code}>
                {s.label}
                {s.is_active ? "" : " (đã tắt)"}
              </option>
            ))}
        </select>
      </div>
      <div>
        <label className="label">Nhãn nút</label>
        <input
          name="label"
          className="input"
          defaultValue={transition?.label}
          placeholder="Ví dụ: Duyệt / Từ chối"
          required
        />
      </div>
      <div>
        <label className="label">Loại nhánh</label>
        <select
          name="kind"
          className="input"
          defaultValue={transition?.kind ?? "forward"}
        >
          <option value="forward">Tiếp tục (nổi bật)</option>
          <option value="reject">Từ chối (đỏ)</option>
          <option value="back">Quay lại</option>
        </select>
      </div>
      <div>
        <label className="label">Thứ tự nút</label>
        <input
          name="sort_order"
          type="number"
          className="input"
          defaultValue={transition?.sort_order ?? 10}
        />
      </div>
      <label className="flex h-10 items-center gap-2 text-sm">
        <input
          name="is_active"
          type="checkbox"
          defaultChecked={transition?.is_active ?? true}
          className="h-4 w-4 accent-brand"
        />
        Đang bật
      </label>
    </div>
  );
}

function TransitionForm({
  steps,
  fromCode,
  transition,
  action,
  onDelete,
  onSuccess,
}: {
  steps: WorkflowStepSetting[];
  fromCode: string;
  transition?: WorkflowTransition;
  action: (formData: FormData) => Promise<ActionResult>;
  onDelete?: () => Promise<ActionResult>;
  onSuccess?: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

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
    if (!onDelete) return;
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
      <TransitionFields steps={steps} transition={transition} fromCode={fromCode} />
      {error && <p className="text-sm text-red-600">{error}</p>}
      {confirmingDelete && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
          Xóa nhánh này? Thao tác không thể hoàn tác.
        </div>
      )}
      <div className="flex justify-end gap-2">
        {transition && onDelete && !confirmingDelete && (
          <button
            type="button"
            className="btn-danger text-sm"
            onClick={() => setConfirmingDelete(true)}
            disabled={pending}
          >
            Xóa nhánh
          </button>
        )}
        {confirmingDelete && (
          <>
            <button
              type="button"
              className="btn-secondary text-sm"
              onClick={() => setConfirmingDelete(false)}
              disabled={pending}
            >
              Hủy
            </button>
            <button
              type="button"
              className="btn-danger text-sm"
              onClick={remove}
              disabled={pending}
            >
              {pending ? "Đang xóa..." : "Xác nhận xóa"}
            </button>
          </>
        )}
        <button className="btn-primary text-sm" disabled={pending}>
          {pending ? "Đang lưu..." : transition ? "Lưu thay đổi" : "Thêm nhánh"}
        </button>
      </div>
    </form>
  );
}

export function WorkflowTransitionsSettingsClient({
  steps,
  transitions,
}: {
  steps: WorkflowStepSetting[];
  transitions: WorkflowTransition[];
}) {
  const [addingFrom, setAddingFrom] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const labelOf = useMemo(() => {
    const map = new Map(steps.map((s) => [s.code, s.label] as const));
    return (code: string) => map.get(code) ?? code;
  }, [steps]);

  const byFrom = useMemo(() => {
    const map = new Map<string, WorkflowTransition[]>();
    for (const t of transitions) {
      const list = map.get(t.from_code) ?? [];
      list.push(t);
      map.set(t.from_code, list);
    }
    for (const list of map.values())
      list.sort((a, b) => a.sort_order - b.sort_order);
    return map;
  }, [transitions]);

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-xl font-semibold">Nhánh chuyển bước</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Mỗi bước có thể có nhiều nút chuyển (duyệt / từ chối / quay lại). Bước
          <strong> không có nhánh đi ra </strong> là điểm kết thúc — trên công
          việc sẽ hiện nút “Hoàn thành”.
        </p>
      </div>

      <div className="space-y-2">
        {steps.map((step) => {
          const edges = byFrom.get(step.code) ?? [];
          const stepColor = step.color || "#EC5AA6";
          return (
            <div
              key={step.code}
              className="card overflow-hidden border-l-4"
              style={{ borderLeftColor: stepColor }}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 p-3">
                <div className="min-w-0">
                  <div className="truncate font-medium">{step.label}</div>
                  {edges.length === 0 && (
                    <div className="text-xs text-gray-400">
                      Điểm kết thúc (không có nhánh đi ra)
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  className="btn-secondary text-sm"
                  onClick={() => setAddingFrom(step.code)}
                >
                  + Thêm nhánh
                </button>
              </div>

              {edges.length > 0 && (
                <div className="border-t border-gray-100 dark:border-gray-800">
                  {edges.map((edge) => {
                    const editing = editingId === edge.id;
                    return (
                      <div key={edge.id} className="px-3 py-2">
                        <div className="flex flex-wrap items-center gap-2 text-sm">
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${KIND_STYLE[edge.kind]}`}
                          >
                            {KIND_LABEL[edge.kind]}
                          </span>
                          <span className="font-medium">{edge.label}</span>
                          <span className="text-gray-400">→</span>
                          <span>{labelOf(edge.to_code)}</span>
                          {!edge.is_active && (
                            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                              Đã tắt
                            </span>
                          )}
                          <button
                            type="button"
                            className="btn-secondary ml-auto text-xs"
                            onClick={() =>
                              setEditingId(editing ? null : edge.id)
                            }
                            aria-expanded={editing}
                          >
                            {editing ? "Thu gọn" : "Sửa"}
                          </button>
                        </div>
                        {editing && (
                          <div className="mt-3 rounded-lg bg-gray-50/60 p-3 dark:bg-gray-950/20">
                            <TransitionForm
                              steps={steps}
                              fromCode={edge.from_code}
                              transition={edge}
                              action={(formData) =>
                                updateWorkflowTransitionAction(edge.id, formData)
                              }
                              onDelete={() =>
                                deleteWorkflowTransitionAction(edge.id)
                              }
                              onSuccess={() => setEditingId(null)}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
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
        open={addingFrom !== null}
        onClose={() => setAddingFrom(null)}
        title={
          addingFrom
            ? `Thêm nhánh từ “${labelOf(addingFrom)}”`
            : "Thêm nhánh chuyển bước"
        }
      >
        {addingFrom && (
          <TransitionForm
            steps={steps}
            fromCode={addingFrom}
            action={createWorkflowTransitionAction}
            onSuccess={() => setAddingFrom(null)}
          />
        )}
      </Modal>
    </div>
  );
}
