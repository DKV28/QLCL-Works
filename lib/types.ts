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

// Task kèm danh sách người phụ trách (join task_assignees -> profiles)
export interface TaskWithAssignees extends Task {
  assignees: Pick<Profile, "id" | "full_name" | "email">[];
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
