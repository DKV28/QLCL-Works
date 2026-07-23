import {
  PROJECT_STATUS_LABEL,
  TASK_PRIORITY_LABEL,
  TASK_STATUS_LABEL,
  type ProjectStatus,
  type TaskPriority,
  type TaskStatus,
} from "@/lib/types";

function Pill({
  children,
  className,
}: {
  children: React.ReactNode;
  className: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${className}`}
    >
      {children}
    </span>
  );
}

const PRIORITY_STYLE: Record<TaskPriority, string> = {
  cao: "bg-red-100 text-red-700",
  trung_binh: "bg-amber-100 text-amber-700",
  thap: "bg-gray-100 text-gray-600",
};

export function PriorityBadge({ value }: { value: TaskPriority }) {
  return <Pill className={PRIORITY_STYLE[value]}>{TASK_PRIORITY_LABEL[value]}</Pill>;
}

const TASK_STATUS_STYLE: Record<TaskStatus, string> = {
  chua_bat_dau: "bg-gray-100 text-gray-600",
  dang_lam: "bg-blue-100 text-blue-700",
  hoan_thanh: "bg-green-100 text-green-700",
};

export function StatusBadge({ value }: { value: TaskStatus }) {
  return <Pill className={TASK_STATUS_STYLE[value]}>{TASK_STATUS_LABEL[value]}</Pill>;
}

const PROJECT_STATUS_STYLE: Record<ProjectStatus, string> = {
  dang_thuc_hien: "bg-blue-100 text-blue-700",
  hoan_thanh: "bg-green-100 text-green-700",
  tam_dung: "bg-gray-100 text-gray-600",
};

export function ProjectStatusBadge({ value }: { value: ProjectStatus }) {
  return (
    <Pill className={PROJECT_STATUS_STYLE[value]}>
      {PROJECT_STATUS_LABEL[value]}
    </Pill>
  );
}

export function OverdueBadge() {
  return <Pill className="bg-red-600 text-white">Quá hạn</Pill>;
}
