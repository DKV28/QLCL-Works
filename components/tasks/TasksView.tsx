"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { TaskTable } from "./TaskTable";
import { KanbanBoard } from "./KanbanBoard";
import { GanttChart } from "./GanttChart";
import { TaskForm } from "./TaskForm";
import { Modal } from "@/components/ui/Modal";
import { createTaskFromListAction } from "@/lib/actions/tasks";
import { filterTasks, sortTasks, type TaskFilters } from "@/lib/logic/filters";
import type { MemberLite, Project, TaskWithAssignees } from "@/lib/types";

type ViewMode = "list" | "kanban" | "gantt";

const VIEW_LABELS: [ViewMode, string][] = [
  ["list", "Danh sách"],
  ["kanban", "Kanban"],
  ["gantt", "Gantt"],
];

export function TasksView({
  tasks,
  members,
  projects,
}: {
  tasks: TaskWithAssignees[];
  members: MemberLite[];
  projects: Pick<Project, "id" | "name">[];
}) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [view, setView] = useState<ViewMode>("list");
  const [filters, setFilters] = useState<TaskFilters>({});

  // Realtime: khi có người khác thay đổi công việc/nhiệm vụ con -> tự làm mới.
  useEffect(() => {
    const supabase = createClient();
    let timer: ReturnType<typeof setTimeout>;
    const refresh = () => {
      clearTimeout(timer);
      timer = setTimeout(() => router.refresh(), 400);
    };
    const channel = supabase
      .channel("tasks-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks" },
        refresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "subtasks" },
        refresh,
      )
      .subscribe();
    return () => {
      clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [router]);

  const visible = useMemo(
    () => sortTasks(filterTasks(tasks, filters)),
    [tasks, filters],
  );

  // Danh sách team duy nhất (từ nhân sự) cho bộ lọc theo team.
  const teamOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const m of members) {
      if (m.team_id && m.team_name) map.set(m.team_id, m.team_name);
    }
    return Array.from(map.entries()).sort((a, b) =>
      a[1].localeCompare(b[1], "vi"),
    );
  }, [members]);

  function update(patch: Partial<TaskFilters>) {
    setFilters((f) => ({ ...f, ...patch }));
  }

  function reset() {
    setFilters({});
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">Công việc</h1>
          <div className="inline-flex rounded-md border border-gray-300 p-0.5 dark:border-gray-700">
            {VIEW_LABELS.map(([mode, label]) => (
              <button
                key={mode}
                onClick={() => setView(mode)}
                className={`rounded px-3 py-1 text-sm font-medium transition-colors ${
                  view === mode
                    ? "bg-brand text-white"
                    : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {visible.length}/{tasks.length} công việc
          </span>
          <button className="btn-primary" onClick={() => setCreating(true)}>
            Thêm công việc
          </button>
        </div>
      </div>

      <div className="card mb-4 p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <div>
            <label className="label">Từ khóa</label>
            <input
              className="input"
              placeholder="Tìm theo tên/mô tả..."
              value={filters.keyword ?? ""}
              onChange={(e) => update({ keyword: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Dự án</label>
            <select
              className="input"
              value={filters.projectId ?? ""}
              onChange={(e) => update({ projectId: e.target.value })}
            >
              <option value="">Tất cả</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Người phụ trách</label>
            <select
              className="input"
              value={filters.assigneeId ?? ""}
              onChange={(e) => update({ assigneeId: e.target.value })}
            >
              <option value="">Tất cả</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.full_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Team</label>
            <select
              className="input"
              value={filters.teamId ?? ""}
              onChange={(e) => update({ teamId: e.target.value })}
            >
              <option value="">Tất cả</option>
              {teamOptions.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Deadline từ</label>
            <input
              type="date"
              className="input"
              value={filters.fromDate ?? ""}
              onChange={(e) => update({ fromDate: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Deadline đến</label>
            <input
              type="date"
              className="input"
              value={filters.toDate ?? ""}
              onChange={(e) => update({ toDate: e.target.value })}
            />
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              className="h-4 w-4 accent-brand"
              checked={filters.onlyOverdue ?? false}
              onChange={(e) => update({ onlyOverdue: e.target.checked })}
            />
            Chỉ hiện công việc quá hạn
          </label>
          <button className="btn-secondary text-sm" onClick={reset}>
            Xóa bộ lọc
          </button>
        </div>
      </div>

      {view === "list" && <TaskTable tasks={visible} members={members} />}
      {view === "kanban" && (
        <KanbanBoard tasks={visible} members={members} projects={projects} />
      )}
      {view === "gantt" && <GanttChart tasks={visible} members={members} />}

      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title="Thêm công việc"
      >
        {projects.length === 0 ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Chưa có dự án nào. Hãy tạo một dự án trước khi thêm công việc.
            </p>
            <div className="flex justify-end">
              <Link href="/du-an" className="btn-primary">
                Tới trang Dự án
              </Link>
            </div>
          </div>
        ) : (
          <TaskForm
            members={members}
            projects={projects}
            onSubmit={createTaskFromListAction}
            onDone={() => {
              setCreating(false);
              router.refresh();
            }}
          />
        )}
      </Modal>
    </div>
  );
}
