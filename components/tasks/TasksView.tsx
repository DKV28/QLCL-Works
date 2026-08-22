"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { TaskTable } from "./TaskTable";
import { KanbanBoard } from "./KanbanBoard";
import { GanttChart } from "./GanttChart";
import { TaskForm } from "./TaskForm";
import { BulkTaskForm } from "./BulkTaskForm";
import { Modal } from "@/components/ui/Modal";
import { createTaskFromListAction } from "@/lib/actions/tasks";
import {
  getTaskWorkLogsAction,
  toggleTaskWorkLogAction,
} from "@/lib/actions/work-logs";
import { filterTasks, sortTasks, type TaskFilters } from "@/lib/logic/filters";
import { isOverdue, todayISO } from "@/lib/logic/overdue";
import type {
  MemberLite,
  Project,
  Tag,
  TaskPrioritySetting,
  TaskWithAssignees,
} from "@/lib/types";

type ViewMode = "list" | "kanban" | "gantt";

const VIEW_LABELS: [ViewMode, string][] = [
  ["list", "Danh sách"],
  ["kanban", "Kanban"],
  ["gantt", "Gantt"],
];

function TaskKpiStrip({ tasks }: { tasks: TaskWithAssignees[] }) {
  const today = todayISO();
  const completed = tasks.filter(
    (task) => task.status === "hoan_thanh" || !!task.completed_at,
  ).length;
  const metrics = [
    {
      label: "Tổng việc",
      value: tasks.length,
      helper: "Trong phạm vi đang xem",
      tone: "text-blue-600 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-300",
      icon: "calendar",
    },
    {
      label: "Quá hạn",
      value: tasks.filter(isOverdue).length,
      helper: "Cần ưu tiên xử lý",
      tone: "text-rose-600 bg-rose-50 dark:bg-rose-950/40 dark:text-rose-300",
      icon: "clock",
    },
    {
      label: "Hôm nay",
      value: tasks.filter(
        (task) =>
          task.due_date === today &&
          task.status !== "hoan_thanh" &&
          !task.completed_at,
      ).length,
      helper: "Có deadline hôm nay",
      tone: "text-orange-600 bg-orange-50 dark:bg-orange-950/40 dark:text-orange-300",
      icon: "today",
    },
    {
      label: "Hoàn thành",
      value: completed,
      helper:
        tasks.length > 0
          ? `${Math.round((completed / tasks.length) * 100)}% tổng công việc`
          : "Chưa có dữ liệu",
      tone: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300",
      icon: "check",
    },
  ];

  return (
    <div className="mb-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
      {metrics.map((metric) => (
        <div key={metric.label} className="card flex min-w-0 items-center gap-3 p-3">
          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${metric.tone}`}>
            {metric.icon === "clock" ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-[18px] w-[18px]" aria-hidden="true">
                <circle cx="12" cy="12" r="8" />
                <path d="M12 8v5l3 2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : metric.icon === "check" ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-[18px] w-[18px]" aria-hidden="true">
                <circle cx="12" cy="12" r="8" />
                <path d="m8.5 12 2.3 2.3 4.8-5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-[18px] w-[18px]" aria-hidden="true">
                <path d="M8 3v3M16 3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z" strokeLinecap="round" strokeLinejoin="round" />
                {metric.icon === "today" && <path d="M9 14h6" strokeLinecap="round" />}
              </svg>
            )}
          </span>
          <div className="min-w-0">
            <div className="flex items-baseline gap-2">
              <span className="truncate text-xs font-medium text-gray-500 dark:text-gray-400">
                {metric.label}
              </span>
              <strong className="text-lg font-bold tabular-nums text-gray-950 dark:text-white">
                {metric.value}
              </strong>
            </div>
            <p className="truncate text-[11px] text-gray-400">{metric.helper}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export function TasksView({
  tasks,
  members,
  projects,
  tags,
  prioritySettings,
  initialTaskId,
}: {
  tasks: TaskWithAssignees[];
  members: MemberLite[];
  projects: Pick<Project, "id" | "name">[];
  tags: Tag[];
  prioritySettings: TaskPrioritySetting[];
  initialTaskId?: string;
}) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [bulkCreating, setBulkCreating] = useState(false);
  const [view, setView] = useState<ViewMode>("list");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [myDayOpen, setMyDayOpen] = useState(false);
  const [filters, setFilters] = useState<TaskFilters>({});
  const [teamTab, setTeamTab] = useState("");
  const [workMemberId, setWorkMemberId] = useState("");
  const [workDate, setWorkDate] = useState(todayISO());
  const [workTaskIds, setWorkTaskIds] = useState<Set<string>>(new Set());
  const [workLogError, setWorkLogError] = useState<string | null>(null);
  const currentDateRef = useRef(todayISO());
  // Một nguồn dữ liệu lạc quan dùng chung cho Danh sách/Kanban/Gantt.
  // Nhờ vậy đổi view không phải chờ router.refresh để thấy thay đổi vừa làm.
  const [localTasks, setLocalTasks] = useState(tasks);
  useEffect(() => setLocalTasks(tasks), [tasks]);

  // Liên kết từ thông báo luôn đưa người dùng về Danh sách và bỏ các bộ lọc
  // đang giữ trong phiên để công việc đích không bị ẩn.
  useEffect(() => {
    if (!initialTaskId) return;
    setView("list");
    setFilters({});
    setTeamTab("");
  }, [initialTaskId]);

  // My day thuộc về từng ngày riêng biệt. Khi qua ngày mới (kể cả lúc mở màn hình
  // qua nửa đêm hoặc quay lại tab sau đó): nếu đang xem "hôm nay" thì tự chuyển
  // sang ngày mới; việc đổi workDate kích hoạt nạp lại nhật ký nên tick tự reset.
  useEffect(() => {
    const syncWorkDate = () => {
      const nextDate = todayISO();
      if (nextDate === currentDateRef.current) return;
      const previousDate = currentDateRef.current;
      currentDateRef.current = nextDate;
      setWorkDate((selectedDate) =>
        selectedDate === previousDate ? nextDate : selectedDate,
      );
    };
    const timer = window.setInterval(syncWorkDate, 60_000);
    // Reset ngay khi người dùng quay lại tab/cửa sổ, không phải chờ tới 60 giây.
    const onVisibility = () => {
      if (document.visibilityState === "visible") syncWorkDate();
    };
    window.addEventListener("focus", syncWorkDate);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", syncWorkDate);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

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
    () => sortTasks(filterTasks(localTasks, filters)),
    [localTasks, filters],
  );
  const activeFilterCount = Object.values(filters).filter(Boolean).length;
  const activeWorkMemberId = myDayOpen ? workMemberId : "";

  useEffect(() => {
    let cancelled = false;
    setWorkLogError(null);
    if (!workMemberId) {
      setWorkTaskIds(new Set());
      return;
    }
    getTaskWorkLogsAction(workDate, workMemberId).then((result) => {
      if (cancelled) return;
      if (result.ok) {
        setWorkTaskIds(new Set((result.logs ?? []).map((log) => log.task_id)));
      } else {
        setWorkTaskIds(new Set());
        setWorkLogError(result.error);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [workMemberId, workDate]);

  function toggleWorkLog(taskId: string, enabled: boolean) {
    if (!workMemberId) return;
    const previous = new Set(workTaskIds);
    setWorkTaskIds((current) => {
      const next = new Set(current);
      if (enabled) next.add(taskId);
      else next.delete(taskId);
      return next;
    });
    setWorkLogError(null);
    toggleTaskWorkLogAction({
      taskId,
      memberId: workMemberId,
      workDate,
      enabled,
    }).then((result) => {
      if (!result.ok) {
        setWorkTaskIds(previous);
        setWorkLogError(result.error);
      }
    });
  }

  function replaceTask(next: TaskWithAssignees) {
    setLocalTasks((current) =>
      current.some((task) => task.id === next.id)
        ? current.map((task) => (task.id === next.id ? next : task))
        : [...current, next],
    );
  }

  function removeTask(id: string) {
    setLocalTasks((current) => current.filter((task) => task.id !== id));
  }

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
    setTeamTab("");
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Công việc</h1>
          <p className="page-description">
            Theo dõi tiến độ, người phụ trách và deadline trong một nơi.
          </p>
          <div className="segmented mt-3">
            {VIEW_LABELS.map(([mode, label]) => (
              <button
                key={mode}
                onClick={() => setView(mode)}
                className={`segmented-item ${
                  view === mode
                    ? "segmented-item-active"
                    : ""
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <span className="mr-1 text-sm text-gray-500 dark:text-gray-400">
            {visible.length}/{localTasks.length} công việc
          </span>
          <button
            type="button"
            className={`inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold transition ${
              filtersOpen || activeFilterCount > 0
                ? "border-brand/30 bg-brand/10 text-brand dark:text-brand-light"
                : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
            }`}
            onClick={() => setFiltersOpen((open) => !open)}
            aria-expanded={filtersOpen}
            aria-controls="task-filters"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-3.5 w-3.5" aria-hidden="true">
              <path d="M4 6h16M7 12h10M10 18h4" strokeLinecap="round" />
            </svg>
            Lọc
            {activeFilterCount > 0 && (
              <span className="rounded-full bg-brand px-1.5 py-0.5 text-[10px] leading-none text-white">
                {activeFilterCount}
              </span>
            )}
          </button>
          {(view === "list" || view === "kanban") && (
            <button
              type="button"
              className={`inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold transition ${
                myDayOpen
                  ? "border-brand/30 bg-brand/10 text-brand dark:text-brand-light"
                  : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
              }`}
              onClick={() => setMyDayOpen((open) => !open)}
              aria-expanded={myDayOpen}
              aria-controls="task-my-day"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-3.5 w-3.5" aria-hidden="true">
                <path d="M8 3v3M16 3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z" strokeLinecap="round" strokeLinejoin="round" />
                <path d="m9 15 2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              My day
            </button>
          )}
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setBulkCreating(true)}
          >
            Nhập hàng loạt
          </button>
          <button className="btn-primary" onClick={() => setCreating(true)}>
            <span className="text-lg leading-none">+</span>
            Công việc
          </button>
        </div>
      </div>

      <TaskKpiStrip tasks={visible} />

      <div className="subnav mb-4">
        <button
          type="button"
          onClick={() => {
            setTeamTab("");
            update({ teamId: "" });
          }}
          className={`subnav-item ${
            teamTab === ""
              ? "subnav-item-active"
              : ""
          }`}
        >
          Tất cả team
        </button>
        {teamOptions.map(([id, name]) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              setTeamTab(id);
              update({ teamId: id });
            }}
            className={`subnav-item ${
              teamTab === id
                ? "subnav-item-active"
                : ""
            }`}
          >
            {name}
          </button>
        ))}
      </div>

      {filtersOpen && <div id="task-filters" className="card mb-4 p-3">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Bộ lọc công việc</h2>
          <button className="text-sm font-medium text-brand hover:underline" onClick={reset}>
            Đặt lại
          </button>
        </div>
        <div className="grid items-end gap-2.5 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-5">
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
            <label className="label" title="Bao gồm phụ trách chính và người hỗ trợ">
              Người phụ trách
            </label>
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
              onChange={(e) => {
                setTeamTab(e.target.value);
                update({ teamId: e.target.value });
              }}
            >
              <option value="">Tất cả</option>
              {teamOptions.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          {tags.length > 0 && (
            <div>
              <label className="label">Nhãn</label>
              <select
                className="input"
                value={filters.tagId ?? ""}
                onChange={(e) => update({ tagId: e.target.value })}
              >
                <option value="">Tất cả</option>
                {tags.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          )}
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

        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-2.5 dark:border-gray-800">
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                className="h-4 w-4 accent-brand"
                checked={filters.onlyOverdue ?? false}
                onChange={(e) => update({ onlyOverdue: e.target.checked })}
              />
              Chỉ hiện công việc quá hạn
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                className="h-4 w-4 accent-brand"
                checked={filters.hideCompleted ?? false}
                onChange={(e) => update({ hideCompleted: e.target.checked })}
              />
              Ẩn công việc đã hoàn thành
            </label>
          </div>
          <span />
        </div>
      </div>}

      {myDayOpen && (view === "list" || view === "kanban") && (
        <div id="task-my-day" className="card mb-4 border-brand/20 bg-brand/[0.025] p-3 dark:bg-brand/[0.04]">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">Ghi nhận My day</h2>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                Đánh dấu việc đã thực hiện, không thay đổi trạng thái hoàn thành.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setMyDayOpen(false)}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200"
              aria-label="Đóng My day"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden="true">
                <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
              </svg>
            </button>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[240px] flex-1">
              <label className="label">My day của</label>
              <select
                className="input"
                value={workMemberId}
                onChange={(e) => setWorkMemberId(e.target.value)}
              >
                <option value="">— Chọn nhân sự để hiện dấu tick —</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.full_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="w-48">
              <label className="label">Ngày thực hiện</label>
              <input
                type="date"
                className="input"
                max={todayISO()}
                value={workDate}
                onChange={(e) => setWorkDate(e.target.value || todayISO())}
              />
            </div>
          </div>
          {workLogError && (
            <p className="mt-2 text-sm text-red-600">{workLogError}</p>
          )}
        </div>
      )}

      {view === "list" && (
        <TaskTable
          tasks={visible}
          members={members}
          tags={tags}
          prioritySettings={prioritySettings}
          onTaskChange={replaceTask}
          onTaskRemove={removeTask}
          workMemberId={activeWorkMemberId}
          workTaskIds={workTaskIds}
          onToggleWorkLog={toggleWorkLog}
          openTaskId={initialTaskId}
        />
      )}
      {view === "kanban" && (
        <KanbanBoard
          tasks={visible}
          members={members}
          projects={projects}
          tags={tags}
          prioritySettings={prioritySettings}
          onTaskChange={replaceTask}
          workMemberId={activeWorkMemberId}
          workTaskIds={workTaskIds}
          onToggleWorkLog={toggleWorkLog}
        />
      )}
      {view === "gantt" && (
        <GanttChart
          tasks={visible}
          members={members}
          tags={tags}
          prioritySettings={prioritySettings}
        />
      )}

      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title="Thêm công việc"
      >
        <TaskForm
          members={members}
          projects={projects}
          tags={tags}
          prioritySettings={prioritySettings}
          onSubmit={createTaskFromListAction}
          onDone={() => {
            setCreating(false);
            router.refresh();
          }}
        />
      </Modal>

      <Modal
        open={bulkCreating}
        onClose={() => setBulkCreating(false)}
        title="Nhập công việc hàng loạt"
      >
        <BulkTaskForm
          members={members}
          projects={projects}
          tags={tags}
          onDone={() => {
            setBulkCreating(false);
            router.refresh();
          }}
        />
      </Modal>
    </div>
  );
}
