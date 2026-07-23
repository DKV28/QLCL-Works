"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createSubtaskAction,
  deleteSubtaskAction,
  toggleSubtaskAction,
} from "@/lib/actions/subtasks";
import type { Subtask } from "@/lib/types";

export function SubtaskList({
  taskId,
  subtasks,
}: {
  taskId: string;
  subtasks: Subtask[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [pending, startTransition] = useTransition();

  const doneCount = subtasks.filter((s) => s.is_done).length;

  function add() {
    const clean = title.trim();
    if (!clean) return;
    startTransition(async () => {
      await createSubtaskAction(taskId, clean);
      setTitle("");
      router.refresh();
    });
  }

  function toggle(s: Subtask) {
    startTransition(async () => {
      await toggleSubtaskAction(s.id, !s.is_done);
      router.refresh();
    });
  }

  function remove(s: Subtask) {
    startTransition(async () => {
      await deleteSubtaskAction(s.id);
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
              className={`flex-1 ${
                s.is_done
                  ? "text-gray-400 line-through dark:text-gray-500"
                  : "text-gray-800 dark:text-gray-200"
              }`}
            >
              {s.title}
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

      <div className="mt-2 flex gap-2">
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
        <button
          type="button"
          className="btn-secondary shrink-0"
          onClick={add}
          disabled={pending || !title.trim()}
        >
          Thêm
        </button>
      </div>
    </div>
  );
}
