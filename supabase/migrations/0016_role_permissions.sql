-- =============================================================
-- QLCL Works — Migration 0016
-- Phân quyền 3 cấp theo vai trò (V3) cho dữ liệu vận hành.
--
-- Nguyên tắc:
--   - ĐỌC (select): giữ dùng chung toàn phòng — mọi tài khoản đăng nhập
--     vẫn thấy đầy đủ dự án/công việc (phục vụ báo cáo, phối hợp).
--   - GHI (insert): mọi tài khoản đăng nhập vẫn tạo được dự án/công việc.
--   - SỬA/XÓA (update — xóa là soft delete qua deleted_at):
--       * admin, manager: toàn quyền trên dữ liệu vận hành.
--       * staff (Thành viên): chỉ sửa/xóa dự án mình sở hữu (owner_id)
--         và công việc mình tạo (created_by).
--   - Cấu trúc công việc (người phụ trách, nhiệm vụ con) đi theo quyền
--     sửa công việc cha.
--   - Bình luận, tệp đính kèm, nhãn gắn việc, nhật ký công việc vẫn để
--     cộng tác chung (không siết ở bước này).
-- =============================================================

-- Helper: người dùng hiện tại có vai trò quản lý trở lên không.
create or replace function public.is_manager_or_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'manager')
  );
$$;

-- -------------------------------------------------------------
-- tasks.created_by: gán mặc định người tạo để RLS phân biệt chủ sở hữu.
-- (Trước đây insert không set created_by nên luôn null.)
-- Bản ghi cũ (created_by null) chỉ admin/manager sửa được — chấp nhận được.
-- -------------------------------------------------------------
alter table public.tasks
  alter column created_by set default auth.uid();

-- -------------------------------------------------------------
-- projects: SỬA = quản lý trở lên HOẶC chủ sở hữu dự án.
-- -------------------------------------------------------------
drop policy if exists projects_update on public.projects;
create policy projects_update on public.projects
  for update to authenticated
  using (public.is_manager_or_admin() or owner_id = auth.uid())
  with check (public.is_manager_or_admin() or owner_id = auth.uid());

-- -------------------------------------------------------------
-- tasks: SỬA = quản lý trở lên HOẶC người tạo công việc.
-- -------------------------------------------------------------
drop policy if exists tasks_update on public.tasks;
create policy tasks_update on public.tasks
  for update to authenticated
  using (public.is_manager_or_admin() or created_by = auth.uid())
  with check (public.is_manager_or_admin() or created_by = auth.uid());

-- -------------------------------------------------------------
-- task_assignees: người phụ trách gắn theo quyền sửa công việc cha.
-- -------------------------------------------------------------
drop policy if exists task_assignees_write on public.task_assignees;
create policy task_assignees_write on public.task_assignees
  for all to authenticated
  using (
    public.is_manager_or_admin()
    or exists (
      select 1 from public.tasks t
      where t.id = task_assignees.task_id and t.created_by = auth.uid()
    )
  )
  with check (
    public.is_manager_or_admin()
    or exists (
      select 1 from public.tasks t
      where t.id = task_assignees.task_id and t.created_by = auth.uid()
    )
  );

-- -------------------------------------------------------------
-- subtasks: nhiệm vụ con gắn theo quyền sửa công việc cha.
-- -------------------------------------------------------------
drop policy if exists subtasks_write on public.subtasks;
create policy subtasks_write on public.subtasks
  for all to authenticated
  using (
    public.is_manager_or_admin()
    or exists (
      select 1 from public.tasks t
      where t.id = subtasks.task_id and t.created_by = auth.uid()
    )
  )
  with check (
    public.is_manager_or_admin()
    or exists (
      select 1 from public.tasks t
      where t.id = subtasks.task_id and t.created_by = auth.uid()
    )
  );
