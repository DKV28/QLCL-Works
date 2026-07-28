// Kiểu dữ liệu domain dùng chung toàn app.

export type Role = "admin" | "manager" | "staff";

export type ProjectStatus = "dang_thuc_hien" | "hoan_thanh" | "tam_dung";
export type TaskPriority = string;
export type TaskStatus = string;
export type TaskRepeat = "none" | "daily" | "weekly" | "monthly";

export interface TaskPrioritySetting {
  code: TaskPriority;
  label: string;
  color: string;
  sort_order: number;
  is_active: boolean;
  is_default: boolean;
  is_system: boolean;
  updated_at: string;
}

export interface TaskStatusSetting {
  code: TaskStatus;
  label: string;
  color: string;
  sort_order: number;
  is_active: boolean;
  is_default: boolean;
  is_terminal: boolean;
  is_system: boolean;
  updated_at: string;
}

export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  role: Role;
  team_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Team {
  id: string;
  name: string;
  parent_id: string | null;
  created_at: string;
}

export interface Member {
  id: string;
  full_name: string;
  team_id: string | null;
  is_active: boolean;
  note: string | null;
  created_at: string;
  updated_at: string;
}

// Nhân sự rút gọn để hiển thị/chọn (kèm tên team đã tính đường dẫn)
export interface MemberLite {
  id: string;
  full_name: string;
  team_id: string | null;
  team_name: string | null; // "Tân Bình / Ngoại trú" hoặc "Quận 7"
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  owner_id: string | null;
  status: ProjectStatus;
  is_template: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Task {
  id: string;
  project_id: string | null;
  title: string;
  description: string | null;
  start_date: string | null;
  due_date: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  repeat: TaskRepeat;
  is_arising: boolean;
  // Bước hiện tại của quy trình vận hành (null = công việc thường).
  // Danh mục bước: lib/logic/van-hanh.ts
  van_hanh_step: string | null;
  completed_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Subtask {
  id: string;
  task_id: string;
  title: string;
  is_done: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Attachment {
  id: string;
  task_id: string;
  file_name: string;
  storage_path: string;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
}

// Task kèm người phụ trách (join task_assignees -> members):
// 1 người phụ trách chính (primary) + nhiều người hỗ trợ (supporters),
// nhiệm vụ con (subtasks) và tệp đính kèm (attachments).
export interface TaskWithAssignees extends Task {
  primary: MemberLite | null;
  supporters: MemberLite[];
  subtasks: Subtask[];
  attachments: Attachment[];
  tags: Pick<Tag, "id" | "name" | "color">[];
}

export interface TaskWorkLog {
  id: string;
  task_id: string;
  member_id: string;
  work_date: string;
  created_by: string;
  created_at: string;
}

export interface TaskDailyNote {
  id: string;
  task_id: string;
  member_id: string;
  note_date: string;
  note: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export const ATTACHMENTS_BUCKET = "task-attachments";

export interface Tag {
  id: string;
  name: string;
  color: string;
  created_at: string;
}

// Bảng màu gợi ý khi tạo nhãn
export const TAG_COLORS = [
  "#ef4444", "#f97316", "#f59e0b", "#22c55e",
  "#14b8a6", "#3b82f6", "#6366f1", "#a855f7",
  "#ec4899", "#64748b",
];

export interface Comment {
  id: string;
  task_id: string;
  author_id: string | null;
  author_name: string | null;
  body: string;
  created_at: string;
}

export interface Notification {
  id: string;
  type: string;
  task_id: string | null;
  project_id: string | null;
  message: string;
  created_at: string;
}

export interface ActivityEntry {
  id: string;
  task_id: string | null;
  project_id: string | null;
  actor_id: string | null;
  actor_name: string | null;
  action: string;
  detail: string | null;
  created_at: string;
}

// --- Nhãn hiển thị tiếng Việt ---

export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  dang_thuc_hien: "Đang thực hiện",
  hoan_thanh: "Hoàn thành",
  tam_dung: "Tạm dừng",
};

export const TASK_PRIORITY_LABEL: Record<string, string> = {
  cao: "Cao",
  trung_binh: "Trung bình",
  thap: "Thấp",
};

export const TASK_STATUS_LABEL: Record<string, string> = {
  chua_bat_dau: "Chưa bắt đầu",
  dang_lam: "Đang làm",
  hoan_thanh: "Hoàn thành",
};

export const TASK_REPEAT_LABEL: Record<TaskRepeat, string> = {
  none: "Không lặp",
  daily: "Hằng ngày",
  weekly: "Hằng tuần",
  monthly: "Hằng tháng",
};

export const TASK_REPEAT_OPTIONS = Object.entries(TASK_REPEAT_LABEL) as [
  TaskRepeat,
  string,
][];

export const PROJECT_STATUS_OPTIONS = Object.entries(PROJECT_STATUS_LABEL) as [
  ProjectStatus,
  string,
][];
export const TASK_PRIORITY_OPTIONS = Object.entries(TASK_PRIORITY_LABEL) as [
  TaskPriority,
  string,
][];
export const TASK_STATUS_OPTIONS = Object.entries(TASK_STATUS_LABEL) as [
  TaskStatus,
  string,
][];
