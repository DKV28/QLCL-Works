import {
  PROJECT_STATUS_LABEL,
  TASK_PRIORITY_LABEL,
  TASK_STATUS_LABEL,
  type ProjectStatus,
  type TaskPriority,
  type TaskPrioritySetting,
  type TaskStatus,
  type TaskStatusSetting,
} from "@/lib/types";

function Pill({
  children,
  className,
  style,
}: {
  children: React.ReactNode;
  className: string;
  style?: React.CSSProperties;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${className}`}
      style={style}
    >
      {children}
    </span>
  );
}

const PRIORITY_STYLE: Record<TaskPriority, string> = {
  cao: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  trung_binh: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  thap: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
};

export function PriorityBadge({
  value,
  setting,
}: {
  value: TaskPriority;
  setting?: TaskPrioritySetting;
}) {
  if (setting) {
    return (
      <Pill className="text-white" style={{ backgroundColor: setting.color }}>
        {setting.label}
      </Pill>
    );
  }
  return <Pill className={PRIORITY_STYLE[value]}>{TASK_PRIORITY_LABEL[value]}</Pill>;
}

const TASK_STATUS_STYLE: Record<TaskStatus, string> = {
  chua_bat_dau: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
  dang_lam: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  hoan_thanh: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
};

export function StatusBadge({
  value,
  setting,
}: {
  value: TaskStatus;
  setting?: TaskStatusSetting;
}) {
  if (setting) {
    return (
      <Pill className="text-white" style={{ backgroundColor: setting.color }}>
        {setting.label}
      </Pill>
    );
  }
  return <Pill className={TASK_STATUS_STYLE[value]}>{TASK_STATUS_LABEL[value]}</Pill>;
}

const PROJECT_STATUS_STYLE: Record<ProjectStatus, string> = {
  dang_thuc_hien: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  hoan_thanh: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
  tam_dung: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
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

export function NeedStartBadge() {
  return <Pill className="bg-orange-500 text-white">Cần bắt đầu</Pill>;
}
