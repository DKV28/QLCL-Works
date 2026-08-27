"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { getSubtasksAction } from "@/lib/actions/subtasks";
import { createFollowupsAction } from "@/lib/actions/tasks";
import type { MemberLite, Subtask, TaskWithAssignees } from "@/lib/types";

interface Row {
  key: string;
  subtaskId: string | null; // null = dòng đề xuất tự do
  title: string;
  dueDate: string; // yyyy-mm-dd
  selected: boolean;
  readonlyTitle: boolean;
}

let freeKey = 0;

/**
 * Hộp thoại "Tạo đề xuất theo dõi": chuyển các nhiệm vụ con (hoặc dòng tự do)
 * thành công việc con của bài gốc, mỗi cái có một ngày hạn cụ thể.
 */
export function FollowupDialog({
  task,
  members,
  onClose,
}: {
  task: TaskWithAssignees;
  members: MemberLite[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [done, setDone] = useState<Subtask[]>([]);
  const [primaryId, setPrimaryId] = useState<string>(task.primary?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let alive = true;
    (async () => {
      const subs = await getSubtasksAction(task.id);
      if (!alive) return;
      // Subtask đã sinh đề xuất -> chỉ hiển thị, không cho tạo lại.
      setDone(subs.filter((s) => s.followup_task_id));
      setRows(
        subs
          .filter((s) => !s.followup_task_id)
          .map((s) => ({
            key: s.id,
            subtaskId: s.id,
            title: s.title,
            dueDate: "",
            selected: false,
            readonlyTitle: true,
          })),
      );
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [task.id]);

  function patch(key: string, next: Partial<Row>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...next } : r)));
  }

  function addFreeRow() {
    setRows((prev) => [
      ...prev,
      {
        key: `free-${freeKey++}`,
        subtaskId: null,
        title: "",
        dueDate: "",
        selected: true,
        readonlyTitle: false,
      },
    ]);
  }

  function removeRow(key: string) {
    setRows((prev) => prev.filter((r) => r.key !== key));
  }

  function submit() {
    setError(null);
    const items = rows
      .filter((r) => r.selected && r.title.trim() && r.dueDate)
      .map((r) => ({
        subtaskId: r.subtaskId,
        title: r.title.trim(),
        dueDate: r.dueDate,
      }));
    if (items.length === 0) {
      setError("Chưa chọn đề xuất hợp lệ (cần tiêu đề và ngày hạn).");
      return;
    }
    startTransition(async () => {
      const res = await createFollowupsAction({
        parentTaskId: task.id,
        primaryMemberId: primaryId || null,
        items,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.refresh();
      onClose();
    });
  }

  return (
    <Modal open onClose={onClose} title="Tạo đề xuất theo dõi">
      <div className="space-y-4">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Từ bài <span className="font-medium">{task.title}</span>. Mỗi đề xuất
          được tạo thành một công việc con, gắn về bài này, với ngày hạn bạn chọn.
        </p>

        <div>
          <label className="label">Người phụ trách chính (áp cho các đề xuất)</label>
          <select
            className="input"
            value={primaryId}
            onChange={(e) => setPrimaryId(e.target.value)}
            disabled={pending}
          >
            <option value="">— Không gán —</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.full_name}
                {m.team_name ? ` — ${m.team_name}` : ""}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <p className="text-sm text-gray-400">Đang tải nhiệm vụ con...</p>
        ) : (
          <div className="space-y-2">
            <div className="label mb-0">Đề xuất</div>
            {rows.length === 0 && (
              <p className="text-xs text-gray-400">
                Chưa có nhiệm vụ con. Bấm “Thêm dòng” để tạo đề xuất tự do.
              </p>
            )}
            {rows.map((r) => (
              <div key={r.key} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={r.selected}
                  onChange={(e) => patch(r.key, { selected: e.target.checked })}
                  disabled={pending}
                  className="h-4 w-4 accent-brand"
                  aria-label="Chọn đề xuất"
                />
                <input
                  className="input flex-1"
                  value={r.title}
                  readOnly={r.readonlyTitle}
                  placeholder="Nội dung đề xuất..."
                  onChange={(e) => patch(r.key, { title: e.target.value })}
                  disabled={pending}
                />
                <input
                  type="date"
                  className="input w-40 text-xs"
                  value={r.dueDate}
                  onChange={(e) => patch(r.key, { dueDate: e.target.value })}
                  disabled={pending}
                  aria-label="Ngày hạn"
                />
                {r.subtaskId === null && (
                  <button
                    type="button"
                    onClick={() => removeRow(r.key)}
                    disabled={pending}
                    className="text-xs text-gray-400 hover:text-red-600"
                    aria-label="Bỏ dòng"
                  >
                    Bỏ
                  </button>
                )}
              </div>
            ))}

            <button
              type="button"
              className="btn-secondary"
              onClick={addFreeRow}
              disabled={pending}
            >
              + Thêm dòng
            </button>

            {done.length > 0 && (
              <div className="mt-2 border-t border-gray-100 pt-2 dark:border-gray-800">
                <p className="text-[11px] text-gray-400">Đã tạo trước đó:</p>
                <ul className="mt-1 space-y-0.5">
                  {done.map((s) => (
                    <li
                      key={s.id}
                      className="truncate text-xs text-gray-400 line-through"
                      title={s.title}
                    >
                      {s.title}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-2 border-t border-gray-100 pt-3 dark:border-gray-800">
          <button
            type="button"
            className="btn-secondary"
            onClick={onClose}
            disabled={pending}
          >
            Hủy
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={submit}
            disabled={pending || loading}
          >
            {pending ? "Đang tạo..." : "Tạo đề xuất"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
