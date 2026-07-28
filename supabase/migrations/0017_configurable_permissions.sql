-- =============================================================
-- QLCL Works — Migration 0015
-- Phân quyền CẤU HÌNH ĐƯỢC: thay vì cứng trong code, quyền sửa/tạo
-- theo vai trò được lưu ở bảng role_permissions và admin chỉnh trong
-- trang Cài đặt. RLS đọc cấu hình này qua hàm SQL.
--
--   - edit_scope: 'all'  = sửa/xóa mọi mục
--                 'own'  = chỉ sửa/xóa mục của mình (owner_id/created_by)
--                 'none' = không được sửa/xóa
--   - can_create: được tạo mới hay không.
--   - Quản trị viên (admin) luôn 'all' + tạo mới (không thể tự khóa) —
--     ép bằng trigger.
-- =============================================================

create table if not exists public.role_permissions (
  resource   text not null check (resource in ('project', 'task')),
  role       text not null check (role in ('admin', 'manager', 'staff')),
  edit_scope text not null default 'own' check (edit_scope in ('all', 'own', 'none')),
  can_create boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (resource, role)
);

drop trigger if exists trg_role_permissions_updated_at on public.role_permissions;
create trigger trg_role_permissions_updated_at
  before update on public.role_permissions
  for each row execute function public.set_updated_at();

-- Admin luôn toàn quyền — chặn tự khóa ở tầng DB.
create or replace function public.enforce_admin_permissions()
returns trigger
language plpgsql
as $$
begin
  if new.role = 'admin' then
    new.edit_scope := 'all';
    new.can_create := true;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_enforce_admin_permissions on public.role_permissions;
create trigger trg_enforce_admin_permissions
  before insert or update on public.role_permissions
  for each row execute function public.enforce_admin_permissions();

-- Giá trị mặc định = tương đương migration 0014 (giữ nguyên hành vi hiện tại).
insert into public.role_permissions (resource, role, edit_scope, can_create)
values
  ('project', 'admin',   'all', true),
  ('project', 'manager', 'all', true),
  ('project', 'staff',   'own', true),
  ('task',    'admin',   'all', true),
  ('task',    'manager', 'all', true),
  ('task',    'staff',   'own', true)
on conflict (resource, role) do nothing;

alter table public.role_permissions enable row level security;

drop policy if exists role_permissions_select on public.role_permissions;
create policy role_permissions_select on public.role_permissions
  for select to authenticated using (true);

drop policy if exists role_permissions_write on public.role_permissions;
create policy role_permissions_write on public.role_permissions
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- -------------------------------------------------------------
-- Hàm đọc cấu hình cho người dùng hiện tại (dùng trong RLS).
-- -------------------------------------------------------------
create or replace function public.my_edit_scope(p_resource text)
returns text
language sql stable security definer set search_path = public
as $$
  select coalesce(
    (select rp.edit_scope
       from public.role_permissions rp
       join public.profiles p on p.role = rp.role
      where p.id = auth.uid() and rp.resource = p_resource),
    'none'
  );
$$;

create or replace function public.my_can_create(p_resource text)
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce(
    (select rp.can_create
       from public.role_permissions rp
       join public.profiles p on p.role = rp.role
      where p.id = auth.uid() and rp.resource = p_resource),
    false
  );
$$;

-- -------------------------------------------------------------
-- Áp cấu hình vào RLS (thay các policy cứng ở 0014).
-- -------------------------------------------------------------

-- projects
drop policy if exists projects_insert on public.projects;
create policy projects_insert on public.projects
  for insert to authenticated
  with check (public.my_can_create('project'));

drop policy if exists projects_update on public.projects;
create policy projects_update on public.projects
  for update to authenticated
  using (
    case public.my_edit_scope('project')
      when 'all' then true
      when 'own' then owner_id = auth.uid()
      else false
    end
  )
  with check (
    case public.my_edit_scope('project')
      when 'all' then true
      when 'own' then owner_id = auth.uid()
      else false
    end
  );

-- tasks
drop policy if exists tasks_insert on public.tasks;
create policy tasks_insert on public.tasks
  for insert to authenticated
  with check (public.my_can_create('task'));

drop policy if exists tasks_update on public.tasks;
create policy tasks_update on public.tasks
  for update to authenticated
  using (
    case public.my_edit_scope('task')
      when 'all' then true
      when 'own' then created_by = auth.uid()
      else false
    end
  )
  with check (
    case public.my_edit_scope('task')
      when 'all' then true
      when 'own' then created_by = auth.uid()
      else false
    end
  );

-- task_assignees: đi theo quyền sửa công việc cha.
drop policy if exists task_assignees_write on public.task_assignees;
create policy task_assignees_write on public.task_assignees
  for all to authenticated
  using (
    case public.my_edit_scope('task')
      when 'all' then true
      when 'own' then exists (
        select 1 from public.tasks t
        where t.id = task_assignees.task_id and t.created_by = auth.uid()
      )
      else false
    end
  )
  with check (
    case public.my_edit_scope('task')
      when 'all' then true
      when 'own' then exists (
        select 1 from public.tasks t
        where t.id = task_assignees.task_id and t.created_by = auth.uid()
      )
      else false
    end
  );

-- subtasks: đi theo quyền sửa công việc cha.
drop policy if exists subtasks_write on public.subtasks;
create policy subtasks_write on public.subtasks
  for all to authenticated
  using (
    case public.my_edit_scope('task')
      when 'all' then true
      when 'own' then exists (
        select 1 from public.tasks t
        where t.id = subtasks.task_id and t.created_by = auth.uid()
      )
      else false
    end
  )
  with check (
    case public.my_edit_scope('task')
      when 'all' then true
      when 'own' then exists (
        select 1 from public.tasks t
        where t.id = subtasks.task_id and t.created_by = auth.uid()
      )
      else false
    end
  );
