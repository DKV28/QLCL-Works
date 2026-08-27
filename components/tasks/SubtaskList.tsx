"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createSubtaskAction,
  deleteSubtaskAction,
  getSubtasksAction,
  toggleSubtaskAction,
  updateSubtaskAction,
} from "@/lib/actions/subtasks";
import type { Subtask } from "@/lib/types";

export function SubtaskList({ taskId }: { taskId: string }) {
  const router = useRouter();
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [offset, setOffset] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [pending, startTransition] = useTransition();

  const doneCount = subtasks.filter((s) => s.is_done).length;

  async function load() {
    const data = await getSubtasksAction(taskId);
    setSubtasks(data);
    setLoading(false);
  }

  useEffect(() => {
    setLoading(true);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId]);

  function add() {
    const clean = title.trim();
    if (!clean) return;
    const days = offset.trim() ? Number(offset) : null;
    startTransition(async () => {
      await createSubtaskAction(taskId, {
        title: clean,
        offsetDays: days,
        dueDate: dueDate || null,
      });
      setTitle("");
      setOffset("");
      setDueDate("");
      await load();
      router.refresh(); // cập nhật badge đếm ở danh sách + việc theo dõi vừa tạo
    });
  }

  function toggle(s: Subtask) {
    startTransition(async () => {
      await toggleSubtaskAction(s.id, !s.is_done);
      await load();
      router.refresh();
    });
  }

  function remove(s: Subtask) {
    startTransition(async () => {
      await deleteSubtaskAction(s.id);
      await load();
      router.refresh();
    });
  }

  /** Lưu số ngày hạn khi rời ô (nếu thay đổi). */
  function saveOffset(s: Subtask, raw: string) {
    const next = raw.trim() ? Number(raw) : null;
    const current = s.followup_offset_days;
    if (next === current) return;
    // Cập nhật lạc quan để ô không nhảy về giá trị cũ.
    setSubtasks((prev) =>
      prev.map((x) =>
        x.id === s.id ? { ...x, followup_offset_days: next } : x,
      ),
    );
    startTransition(async () => {
      await updateSubtaskAction(s.id, { offsetDays: next });
    });
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="label mb-0">Nhiệm vụ con</span>
        {subtasks.length > 0 && (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {doneCount}/{subtasks.length} hoàn thành
          </span>
        )}
      </div>

      {loading && <p className="text-xs text-gray-400">Đang tải...</p>}

      <div className="space-y-1">
        {subtasks.map((s) => (
          <div
            key={s.id}
            className="flex items-center gap-2 rounded px-1 py-1 text-sm"
          >
            <input
              type="checkbox"
              checked={s.is_done}
              onChange={() => toggle(s)}
              disabled={pending}
              className="h-4 w-4 accent-brand"
            />
            <span
              className={`flex-1 truncate ${
                s.is_done
                  ? "text-gray-400 dark:text-gray-500"
                  : "text-gray-800 dark:text-gray-200"
              }`}
              title={s.title}
            >
              {s.title}
              {s.followup_task_id && (
                <span
                  className="ml-1 rounded bg-emerald-100 px-1 text-[10px] font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                  title="Đã tạo đề xuất theo dõi từ nhiệm vụ con này"
                >
                  đã tạo đề xuất
                </span>
              )}
            </span>
            <label className="flex shrink-0 items-center gap-1 text-[11px] text-gray-400">
              <span className="w-14">
                <input
                  type="number"
                  min={1}
                  defaultValue={s.followup_offset_days ?? ""}
                  onBlur={(e) => saveOffset(s, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      (e.target as HTMLInputElement).blur();
                    }
                  }}
                  disabled={pending}
                  placeholder="hạn"
                  title="Số ngày hạn sau khi hoàn thành: có số → tự tạo đề xuất theo dõi"
                  className="input block px-1.5 py-0.5 text-right text-xs"
                />
              </span>
              <span>ngày</span>
            </label>
            <button
              type="button"
              onClick={() => remove(s)}
              disabled={pending}
              className="text-xs text-gray-400 hover:text-red-600"
              aria-label="Xóa nhiệm vụ con"
            >
              Xóa
            </button>
          </div>
        ))}
      </div>

      <div className="mt-2 space-y-2">
        <input
          className="input"
          placeholder="Thêm nhiệm vụ con..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          disabled={pending}
        />
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1">
            <span className="w-14">
              <input
                type="number"
                min={1}
                className="input block text-right text-xs"
                placeholder="số ngày"
                title="Số ngày kể từ hôm nay (ngày làm việc, trừ CN)"
                value={offset}
                onChange={(e) => setOffset(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    add();
                  }
                }}
                disabled={pending || !!dueDate}
              />
            </span>
            <span className="text-[11px] text-gray-400">ngày</span>
          </span>
          <span className="text-[11px] text-gray-400">hoặc</span>
          <input
            type="date"
            className="input w-40 text-xs"
            title="Chọn ngày hạn cụ thể"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            disabled={pending}
          />
          <button
            type="button"
            className="btn-secondary ml-auto shrink-0"
            onClick={add}
            disabled={pending || !title.trim()}
          >
            Thêm
          </button>
        </div>
      </div>
      <p className="mt-1 text-[11px] text-gray-400">
        Có nhập hạn (số ngày kể từ hôm nay hoặc chọn ngày cụ thể) → một công việc
        theo dõi (đề xuất) được tạo ngay khi bấm Thêm, gắn với bài này. Nếu chọn
        ngày cụ thể thì ưu tiên ngày đó.
      </p>
    </div>
  );
}
