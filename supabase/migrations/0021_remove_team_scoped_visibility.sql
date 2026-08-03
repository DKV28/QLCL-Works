-- Remove account-to-team assignment and team-scoped visibility introduced in 0020.
-- Team/member structure remains available for organization and UI grouping only.

update public.profiles
set role = 'staff', team_id = null
where role = 'team_lead';

-- Account team assignments are no longer used.
update public.profiles set team_id = null where team_id is not null;

delete from public.role_permissions where role = 'team_lead';

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check
  check (role in ('admin', 'manager', 'staff'));

alter table public.role_permissions
  drop constraint if exists role_permissions_role_check;
alter table public.role_permissions
  add constraint role_permissions_role_check
  check (role in ('admin', 'manager', 'staff'));

-- Restore room-wide read access used before team-scoped authorization.
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated using (true);

drop policy if exists teams_select on public.teams;
create policy teams_select on public.teams
  for select to authenticated using (true);

drop policy if exists members_select on public.members;
create policy members_select on public.members
  for select to authenticated using (true);

drop policy if exists members_write on public.members;
create policy members_write on public.members
  for all to authenticated using (true) with check (true);

drop policy if exists tasks_select on public.tasks;
create policy tasks_select on public.tasks
  for select to authenticated using (true);

drop policy if exists task_assignees_select on public.task_assignees;
create policy task_assignees_select on public.task_assignees
  for select to authenticated using (true);

drop policy if exists subtasks_select on public.subtasks;
create policy subtasks_select on public.subtasks
  for select to authenticated using (true);

drop policy if exists attachments_select on public.attachments;
create policy attachments_select on public.attachments
  for select to authenticated using (true);

drop policy if exists attachments_write on public.attachments;
create policy attachments_write on public.attachments
  for all to authenticated using (true) with check (true);

drop policy if exists comments_select on public.comments;
create policy comments_select on public.comments
  for select to authenticated using (true);

drop policy if exists comments_write on public.comments;
create policy comments_write on public.comments
  for all to authenticated using (true) with check (true);

drop policy if exists activity_select on public.activity_log;
create policy activity_select on public.activity_log
  for select to authenticated using (true);

drop policy if exists activity_insert on public.activity_log;
create policy activity_insert on public.activity_log
  for insert to authenticated with check (true);

drop policy if exists notifications_select on public.notifications;
create policy notifications_select on public.notifications
  for select to authenticated using (true);

drop policy if exists notifications_insert on public.notifications;
create policy notifications_insert on public.notifications
  for insert to authenticated with check (true);

drop policy if exists task_tags_select on public.task_tags;
create policy task_tags_select on public.task_tags
  for select to authenticated using (true);

drop policy if exists task_tags_write on public.task_tags;
create policy task_tags_write on public.task_tags
  for all to authenticated using (true) with check (true);

drop policy if exists task_work_logs_select on public.task_work_logs;
create policy task_work_logs_select on public.task_work_logs
  for select to authenticated using (true);

drop policy if exists task_daily_notes_select on public.task_daily_notes;
create policy task_daily_notes_select on public.task_daily_notes
  for select to authenticated using (true);

drop policy if exists "task_attachments_read" on storage.objects;
create policy "task_attachments_read" on storage.objects
  for select to authenticated
  using (bucket_id = 'task-attachments');

drop policy if exists "task_attachments_insert" on storage.objects;
create policy "task_attachments_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'task-attachments');

drop policy if exists "task_attachments_delete" on storage.objects;
create policy "task_attachments_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'task-attachments');

drop function if exists public.can_view_task_path(text);
drop function if exists public.can_view_task(uuid);
drop function if exists public.current_team_id();
drop function if exists public.current_app_role();

drop index if exists public.idx_tasks_department_wide;
alter table public.tasks drop column if exists is_department_wide;
