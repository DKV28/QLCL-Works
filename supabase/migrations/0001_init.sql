-- =============================================================
-- QLCL Works — Migration 0001 (V1)
-- Schema lõi + RLS. Thiết kế chừa sẵn cho V2–V5:
--   - profiles.role, profiles.team_id: sẵn cho phân quyền 3 cấp (V3)
--   - task_assignees: bảng join sẵn cho multi-assignee (V2)
--   - soft delete (deleted_at) trên projects/tasks
--   - subtasks, attachments sẽ thêm additively ở V2 (không sửa bảng V1)
-- Toàn bộ timestamp lưu UTC (timestamptz).
-- =============================================================

-- Hàm tiện ích: tự cập nhật updated_at khi UPDATE
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- -------------------------------------------------------------
-- teams — nhóm/tổ (phục vụ cấp "Quản lý" ở V3; V1 chưa có UI quản lý)
-- (teams và profiles tham chiếu chéo nhau → tạo teams trước không FK
--  manager_id, rồi thêm FK bằng ALTER sau khi profiles tồn tại)
-- -------------------------------------------------------------
create table if not exists public.teams (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  manager_id  uuid,
  created_at  timestamptz not null default now()
);

-- -------------------------------------------------------------
-- profiles — hồ sơ người dùng, 1-1 với auth.users
-- -------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  email       text,
  role        text not null default 'staff' check (role in ('admin','manager','staff')),
  team_id     uuid references public.teams(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Bổ sung FK manager_id sau khi profiles đã tồn tại
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'teams_manager_id_fkey'
  ) then
    alter table public.teams
      add constraint teams_manager_id_fkey
      foreign key (manager_id) references public.profiles(id) on delete set null;
  end if;
end;
$$;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Tự tạo profile khi có user mới trong auth.users
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    coalesce(new.raw_user_meta_data->>'role', 'staff')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -------------------------------------------------------------
-- projects — dự án
-- -------------------------------------------------------------
create table if not exists public.projects (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  owner_id    uuid references public.profiles(id) on delete set null,
  status      text not null default 'dang_thuc_hien'
                check (status in ('dang_thuc_hien','hoan_thanh','tam_dung')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz
);

drop trigger if exists trg_projects_updated_at on public.projects;
create trigger trg_projects_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

create index if not exists idx_projects_deleted_at on public.projects(deleted_at);

-- -------------------------------------------------------------
-- tasks — công việc
-- -------------------------------------------------------------
create table if not exists public.tasks (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references public.projects(id) on delete cascade,
  title        text not null,
  description  text,
  start_date   date,
  due_date     date,
  priority     text not null default 'trung_binh'
                 check (priority in ('cao','trung_binh','thap')),
  status       text not null default 'chua_bat_dau'
                 check (status in ('chua_bat_dau','dang_lam','hoan_thanh')),
  completed_at timestamptz,               -- checkbox hoàn thành nhanh
  created_by   uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz
);

drop trigger if exists trg_tasks_updated_at on public.tasks;
create trigger trg_tasks_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

create index if not exists idx_tasks_project_id  on public.tasks(project_id);
create index if not exists idx_tasks_due_date    on public.tasks(due_date);
create index if not exists idx_tasks_deleted_at  on public.tasks(deleted_at);

-- -------------------------------------------------------------
-- task_assignees — bảng join (V1 dùng 1 người/công việc, V2 mở nhiều)
-- -------------------------------------------------------------
create table if not exists public.task_assignees (
  task_id     uuid not null references public.tasks(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  primary key (task_id, user_id)
);

create index if not exists idx_task_assignees_user on public.task_assignees(user_id);

-- =============================================================
-- RLS — V1: cả phòng thấy chung mọi dữ liệu (thắt chặt theo role ở V3)
-- Cấu trúc policy viết theo auth.uid() + role để V3 chỉ đổi điều kiện.
-- =============================================================

-- Helper: người dùng hiện tại có phải admin không (dùng ở nhiều policy)
create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

alter table public.profiles       enable row level security;
alter table public.teams          enable row level security;
alter table public.projects       enable row level security;
alter table public.tasks          enable row level security;
alter table public.task_assignees enable row level security;

-- profiles: mọi người đăng nhập đọc được danh bạ; tự sửa hồ sơ mình;
-- chỉ admin đổi role/team của người khác.
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated using (true);

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- teams: đọc chung; chỉ admin ghi (V1 chưa có UI)
drop policy if exists teams_select on public.teams;
create policy teams_select on public.teams
  for select to authenticated using (true);

drop policy if exists teams_write on public.teams;
create policy teams_write on public.teams
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- projects: V1 cả phòng đọc/ghi chung
drop policy if exists projects_select on public.projects;
create policy projects_select on public.projects
  for select to authenticated using (true);

drop policy if exists projects_insert on public.projects;
create policy projects_insert on public.projects
  for insert to authenticated with check (true);

drop policy if exists projects_update on public.projects;
create policy projects_update on public.projects
  for update to authenticated using (true) with check (true);

-- tasks: V1 cả phòng đọc/ghi chung
drop policy if exists tasks_select on public.tasks;
create policy tasks_select on public.tasks
  for select to authenticated using (true);

drop policy if exists tasks_insert on public.tasks;
create policy tasks_insert on public.tasks
  for insert to authenticated with check (true);

drop policy if exists tasks_update on public.tasks;
create policy tasks_update on public.tasks
  for update to authenticated using (true) with check (true);

-- task_assignees: V1 cả phòng đọc/ghi chung
drop policy if exists task_assignees_select on public.task_assignees;
create policy task_assignees_select on public.task_assignees
  for select to authenticated using (true);

drop policy if exists task_assignees_write on public.task_assignees;
create policy task_assignees_write on public.task_assignees
  for all to authenticated using (true) with check (true);
