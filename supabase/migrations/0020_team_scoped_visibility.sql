-- Team-scoped visibility and the Teamlead application role.
-- Managers/admins see all teams. Teamleads/staff see their assigned team plus
-- tasks explicitly marked as department-wide.

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check
  check (role in ('admin', 'manager', 'team_lead', 'staff'));

alter table public.role_permissions
  drop constraint if exists role_permissions_role_check;
alter table public.role_permissions
  add constraint role_permissions_role_check
  check (role in ('admin', 'manager', 'team_lead', 'staff'));

insert into public.role_permissions (resource, role, edit_scope, can_create)
values
  ('project', 'team_lead', 'own', true),
  ('task', 'team_lead', 'own', true)
on conflict (resource, role) do nothing;

alter table public.tasks
  add column if not exists is_department_wide boolean not null default false;

-- Existing tasks without a team assignment remain visible to the whole room.
update public.tasks t
set is_department_wide = true
where not exists (
  select 1
  from public.task_assignees ta
  join public.members m on m.id = ta.member_id
  where ta.task_id = t.id and m.team_id is not null
);

create index if not exists idx_tasks_department_wide
  on public.tasks(is_department_wide)
  where is_department_wide = true;

create or replace function public.current_app_role()
returns text
language sql stable security definer set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.current_team_id()
returns uuid
language sql stable security definer set search_path = public
as $$
  select team_id from public.profiles where id = auth.uid();
$$;

create or replace function public.can_view_task(p_task_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from public.tasks t
    where t.id = p_task_id
      and (
        public.current_app_role() in ('admin', 'manager')
        or t.is_department_wide
        or (
          t.created_by = auth.uid()
          and not exists (
            select 1 from public.task_assignees pending_ta
            where pending_ta.task_id = t.id
          )
        )
        or (
          public.current_team_id() is not null
          and exists (
            select 1
            from public.task_assignees ta
            join public.members m on m.id = ta.member_id
            where ta.task_id = t.id
              and m.team_id = public.current_team_id()
          )
        )
      )
  );
$$;

create or replace function public.can_view_task_path(p_path text)
returns boolean
language plpgsql stable security definer set search_path = public
as $$
declare
  task_part text := split_part(p_path, '/', 1);
begin
  if task_part !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    return false;
  end if;
  return public.can_view_task(task_part::uuid);
end;
$$;

-- Team and people directories expose only the current team to Teamlead/staff.
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated using (
    id = auth.uid()
    or public.current_app_role() in ('admin', 'manager')
    or (team_id is not null and team_id = public.current_team_id())
  );

drop policy if exists teams_select on public.teams;
create policy teams_select on public.teams
  for select to authenticated using (
    public.current_app_role() in ('admin', 'manager')
    or id = public.current_team_id()
  );

drop policy if exists members_select on public.members;
create policy members_select on public.members
  for select to authenticated using (
    public.current_app_role() in ('admin', 'manager')
    or (team_id is not null and team_id = public.current_team_id())
  );

drop policy if exists members_write on public.members;
create policy members_write on public.members
  for all to authenticated
  using (public.current_app_role() in ('admin', 'manager'))
  with check (public.current_app_role() in ('admin', 'manager'));

-- Task rows and all task-linked read models use the same visibility predicate.
drop policy if exists tasks_select on public.tasks;
create policy tasks_select on public.tasks
  for select to authenticated using (public.can_view_task(id));

drop policy if exists task_assignees_select on public.task_assignees;
create policy task_assignees_select on public.task_assignees
  for select to authenticated using (
    public.can_view_task(task_id)
    and (
      public.current_app_role() in ('admin', 'manager')
      or exists (
        select 1 from public.members scoped_member
        where scoped_member.id = task_assignees.member_id
          and scoped_member.team_id = public.current_team_id()
      )
    )
  );

drop policy if exists subtasks_select on public.subtasks;
create policy subtasks_select on public.subtasks
  for select to authenticated using (public.can_view_task(task_id));

drop policy if exists attachments_select on public.attachments;
create policy attachments_select on public.attachments
  for select to authenticated using (public.can_view_task(task_id));

drop policy if exists attachments_write on public.attachments;
create policy attachments_write on public.attachments
  for all to authenticated
  using (public.can_view_task(task_id))
  with check (public.can_view_task(task_id));

drop policy if exists comments_select on public.comments;
create policy comments_select on public.comments
  for select to authenticated using (public.can_view_task(task_id));

drop policy if exists comments_write on public.comments;
create policy comments_write on public.comments
  for all to authenticated
  using (public.can_view_task(task_id))
  with check (public.can_view_task(task_id));

drop policy if exists activity_select on public.activity_log;
create policy activity_select on public.activity_log
  for select to authenticated using (
    task_id is null or public.can_view_task(task_id)
  );

drop policy if exists activity_insert on public.activity_log;
create policy activity_insert on public.activity_log
  for insert to authenticated with check (
    task_id is null or public.can_view_task(task_id)
  );

drop policy if exists notifications_select on public.notifications;
create policy notifications_select on public.notifications
  for select to authenticated using (
    task_id is null or public.can_view_task(task_id)
  );

drop policy if exists notifications_insert on public.notifications;
create policy notifications_insert on public.notifications
  for insert to authenticated with check (
    task_id is null or public.can_view_task(task_id)
  );

drop policy if exists task_tags_select on public.task_tags;
create policy task_tags_select on public.task_tags
  for select to authenticated using (public.can_view_task(task_id));

drop policy if exists task_tags_write on public.task_tags;
create policy task_tags_write on public.task_tags
  for all to authenticated
  using (public.can_view_task(task_id))
  with check (public.can_view_task(task_id));

drop policy if exists task_work_logs_select on public.task_work_logs;
create policy task_work_logs_select on public.task_work_logs
  for select to authenticated using (public.can_view_task(task_id));

drop policy if exists task_daily_notes_select on public.task_daily_notes;
create policy task_daily_notes_select on public.task_daily_notes
  for select to authenticated using (public.can_view_task(task_id));

-- Storage object paths start with the task UUID.
drop policy if exists "task_attachments_read" on storage.objects;
create policy "task_attachments_read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'task-attachments'
    and public.can_view_task_path(name)
  );

drop policy if exists "task_attachments_insert" on storage.objects;
create policy "task_attachments_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'task-attachments'
    and public.can_view_task_path(name)
  );

drop policy if exists "task_attachments_delete" on storage.objects;
create policy "task_attachments_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'task-attachments'
    and public.can_view_task_path(name)
  );
