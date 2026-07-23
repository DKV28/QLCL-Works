// Kiểu dữ liệu domain dùng chung toàn app.

export type Role = "admin" | "manager" | "staff";

export type ProjectStatus = "dang_thuc_hien" | "hoan_thanh" | "tam_dung";
export type TaskPriority = "cao" | "trung_binh" | "thap";
export type TaskStatus = "chua_bat_dau" | "dang_lam" | "hoan_thanh";

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
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Task {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  start_date: string | null;
  due_date: string | null;
  priority: TaskPriority;
  status: TaskStatus;
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
}

export const ATTACHMENTS_BUCKET = "task-attachments";

export interface Comment {
  id: string;
  task_id: string;
  author_id: string | null;
  author_name: string | null;
  body: string;
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

export const TASK_PRIORITY_LABEL: Record<TaskPriority, string> = {
  cao: "Cao",
  trung_binh: "Trung bình",
  thap: "Thấp",
};

export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  chua_bat_dau: "Chưa bắt đầu",
  dang_lam: "Đang làm",
  hoan_thanh: "Hoàn thành",
};

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
