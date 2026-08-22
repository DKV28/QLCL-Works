"use client";

import { useMemo, useState } from "react";
import { TaskEditModal } from "./TaskEditModal";
import { isOverdue, todayISO } from "@/lib/logic/overdue";
import type {
  MemberLite,
  Tag,
  TaskPrioritySetting,
  TaskWithAssignees,
} from "@/lib/types";

const LABEL_W = 200;
const DAY_W = 32;
const ROW_H = 40;

const MS_PER_DAY = 86_400_000;

function toDayIndex(iso: string): number {
  return Math.floor(new Date(iso + "T00:00:00Z").getTime() / MS_PER_DAY);
}

function fromDayIndex(idx: number): Date {
  return new Date(idx * MS_PER_DAY);
}

const MONTHS = [
  "Th1", "Th2", "Th3", "Th4", "Th5", "Th6",
  "Th7", "Th8", "Th9", "Th10", "Th11", "Th12",
];

export function GanttChart({
  tasks,
  members,
  tags,
  prioritySettings,
}: {
  tasks: TaskWithAssignees[];
  members: MemberLite[];
  tags: Tag[];
  prioritySettings: TaskPrioritySetting[];
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const editing = tasks.find((t) => t.id === editingId) ?? null;

  // Mỗi công việc là một mốc theo deadline.
  const dated = useMemo(() => {
    return tasks
      .map((t) => {
        if (!t.due_date) return null;
        const idx = toDayIndex(t.due_date);
        return { task: t, startIdx: idx, endIdx: idx };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
  }, [tasks]);

  const undated = tasks.filter((t) => !t.due_date);

  const range = useMemo(() => {
    if (dated.length === 0) return null;
    let min = Infinity;
    let max = -Infinity;
    for (const d of dated) {
      min = Math.min(min, d.startIdx);
      max = Math.max(max, d.endIdx);
    }
    const today = toDayIndex(todayISO());
    min = Math.min(min, today) - 1;
    max = Math.max(max, today) + 1;
    return { min, max };
  }, [dated]);

  if (!range) {
    return (
      <div className="empty-state">
        Chưa có công việc nào có deadline để vẽ Gantt.
      </div>
    );
  }

  const totalDays = range.max - range.min + 1;
  const timelineWidth = totalDays * DAY_W;
  const todayIdx = toDayIndex(todayISO());

  // Ngày và các đoạn tháng cho header
  const days = Array.from({ length: totalDays }, (_, i) => range.min + i);
  const monthSegments: { label: string; count: number }[] = [];
  for (const dayIdx of days) {
    const d = fromDayIndex(dayIdx);
    const label = `${MONTHS[d.getUTCMonth()]}/${d.getUTCFullYear()}`;
    const last = monthSegments[monthSegments.length - 1];
    if (last && last.label === label) last.count += 1;
    else monthSegments.push({ label, count: 1 });
  }

  function barColor(t: TaskWithAssignees): string {
    if (t.completed_at || t.status === "hoan_thanh") return "bg-green-500";
    if (isOverdue(t)) return "bg-red-500";
    return "bg-brand";
  }

  return (
    <>
      <div className="card overflow-x-auto">
        <div style={{ width: LABEL_W + timelineWidth }}>
          {/* Header: tháng */}
          <div className="flex border-b border-gray-200 dark:border-gray-800">
            <div
              className="sticky left-0 z-10 shrink-0 border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
              style={{ width: LABEL_W }}
            />
            <div className="flex">
              {monthSegments.map((m, i) => (
                <div
                  key={i}
                  className="border-l border-gray-200 px-2 py-1 text-xs font-semibold text-gray-600 dark:border-gray-800 dark:text-gray-300"
                  style={{ width: m.count * DAY_W }}
                >
                  {m.label}
                </div>
              ))}
            </div>
          </div>

          {/* Header: ngày */}
          <div className="flex border-b border-gray-200 dark:border-gray-800">
            <div
              className="sticky left-0 z-10 shrink-0 border-r border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-500 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400"
              style={{ width: LABEL_W }}
            >
              Công việc
            </div>
            {days.map((dayIdx) => {
              const d = fromDayIndex(dayIdx);
              const weekend = d.getUTCDay() === 0 || d.getUTCDay() === 6;
              const isToday = dayIdx === todayIdx;
              return (
                <div
                  key={dayIdx}
                  className={`shrink-0 text-center text-[11px] leading-6 ${
                    isToday
                      ? "bg-brand/10 font-semibold text-brand"
                      : weekend
                        ? "bg-gray-50 text-gray-400 dark:bg-gray-950/40"
                        : "text-gray-500 dark:text-gray-400"
                  }`}
                  style={{ width: DAY_W }}
                >
                  {d.getUTCDate()}
                </div>
              );
            })}
          </div>

          {/* Các dòng công việc */}
          {dated.map(({ task, startIdx, endIdx }) => {
            const left = (startIdx - range.min) * DAY_W;
            const width = (endIdx - startIdx + 1) * DAY_W;
            return (
              <div
                key={task.id}
                className="flex border-b border-gray-100 last:border-0 dark:border-gray-800"
                style={{ height: ROW_H }}
              >
                <div
                  className="sticky left-0 z-10 flex shrink-0 items-center truncate border-r border-gray-200 bg-white px-3 text-sm dark:border-gray-800 dark:bg-gray-900"
                  style={{ width: LABEL_W }}
                  title={task.title}
                >
                  <span className="truncate">{task.title}</span>
                </div>
                <div
                  className="relative"
                  style={{ width: timelineWidth }}
                >
                  {/* Vạch hôm nay */}
                  <div
                    className="absolute bottom-0 top-0 w-px bg-brand/40"
                    style={{ left: (todayIdx - range.min) * DAY_W }}
                  />
                  {/* Thanh công việc */}
                  <button
                    type="button"
                    onClick={() => setEditingId(task.id)}
                    className={`absolute rounded-md ${barColor(task)} px-2 text-left text-xs font-medium text-white shadow-sm hover:opacity-90`}
                    style={{
                      left: left + 2,
                      width: Math.max(width - 4, 12),
                      top: 8,
                      height: ROW_H - 16,
                    }}
                    title={task.title}
                  >
                    <span className="block truncate leading-6">
                      {task.primary?.full_name ?? task.title}
                    </span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {undated.length > 0 && (
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
          {undated.length} công việc chưa có mốc thời gian (không hiện trên Gantt):{" "}
          {undated.map((t) => t.title).join(", ")}
        </p>
      )}

      <TaskEditModal
        task={editing}
        members={members}
        tags={tags}
        prioritySettings={prioritySettings}
        onClose={() => setEditingId(null)}
      />
    </>
  );
}
