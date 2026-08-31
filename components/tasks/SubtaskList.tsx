"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createSubtaskAction,
  deleteSubtaskAction,
  getSubtasksAction,
  toggleSubtaskAction,
} from "@/lib/actions/subtasks";
import type { Subtask } from "@/lib/types";

export function SubtaskList({ taskId }: { taskId: string }) {
  const router = useRouter();
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
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
    startTransition(async () => {
      await createSubtaskAction(taskId, {
        title: clean,
        dueDate: dueDate || null,
      });
      setTitle("");
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
          <span className="text-[11px] text-gray-400">Ngày hạn (tùy chọn):</span>
          <input
            type="date"
            className="input w-40 text-xs"
            title="Chọn ngày hạn cho đề xuất theo dõi"
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
    </div>
  );
}
