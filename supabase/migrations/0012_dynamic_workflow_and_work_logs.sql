-- Dynamic workflow settings, safe team deletion support and daily work logs.

alter table public.task_priority_settings
  add column if not exists is_system boolean not null default false;
alter table public.task_status_settings
  add column if not exists is_system boolean not null default false;

update public.task_priority_settings
set is_system = true
where code in ('cao', 'trung_binh', 'thap');

update public.task_status_settings
set is_system = true
where code in ('chua_bat_dau', 'dang_lam', 'hoan_thanh');

-- Remove the original fixed-value checks without relying on generated names.
do $$
declare constraint_row record;
begin
  for constraint_row in
    select c.conname, c.conrelid
    from pg_constraint c
    where c.conrelid = 'public.tasks'::regclass
      and c.contype = 'c'
      and (
        pg_get_constraintdef(c.oid) ilike '%priority%'
        or pg_get_constraintdef(c.oid) ilike '%status%'
      )
  loop
    execute format(
      'alter table %s drop constraint %I',
      constraint_row.conrelid::regclass,
      constraint_row.conname
    );
  end loop;

  for constraint_row in
    select c.conname, c.conrelid
    from pg_constraint c
    where c.conrelid in (
      'public.task_priority_settings'::regclass,
      'public.task_status_settings'::regclass
    )
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ilike '%code%'
  loop
    execute format(
      'alter table %s drop constraint %I',
      constraint_row.conrelid::regclass,
      constraint_row.conname
    );
  end loop;
end $$;

alter table public.tasks
  drop constraint if exists tasks_priority_fkey,
  drop constraint if exists tasks_status_fkey;
alter table public.tasks
  add constraint tasks_priority_fkey foreign key (priority)
    references public.task_priority_settings(code) on update cascade on delete restrict,
  add constraint tasks_status_fkey foreign key (status)
    references public.task_status_settings(code) on update cascade on delete restrict;

alter table public.task_priority_settings
  add constraint task_priority_settings_code_format
  check (code ~ '^[a-z0-9_]+$');
alter table public.task_status_settings
  add constraint task_status_settings_code_format
  check (code ~ '^[a-z0-9_]+$');

create table if not exists public.task_work_logs (
  id          uuid primary key default gen_random_uuid(),
  task_id     uuid not null references public.tasks(id) on delete cascade,
  member_id   uuid not null references public.members(id) on delete cascade,
  work_date   date not null check (work_date <= current_date),
  created_by  uuid not null references auth.users(id) on delete restrict default auth.uid(),
  created_at  timestamptz not null default now(),
  unique (task_id, member_id, work_date)
);

create index if not exists idx_task_work_logs_member_date
  on public.task_work_logs(member_id, work_date);
create index if not exists idx_task_work_logs_date
  on public.task_work_logs(work_date);

alter table public.task_work_logs enable row level security;

drop policy if exists task_work_logs_select on public.task_work_logs;
create policy task_work_logs_select on public.task_work_logs
  for select to authenticated using (true);

drop policy if exists task_work_logs_insert on public.task_work_logs;
create policy task_work_logs_insert on public.task_work_logs
  for insert to authenticated
  with check (
    created_by = auth.uid()
    and work_date <= current_date
    and exists (
      select 1 from public.task_assignees a
      where a.task_id = task_work_logs.task_id
        and a.member_id = task_work_logs.member_id
    )
  );

drop policy if exists task_work_logs_delete on public.task_work_logs;
create policy task_work_logs_delete on public.task_work_logs
  for delete to authenticated
  using (
    exists (
      select 1 from public.task_assignees a
      where a.task_id = task_work_logs.task_id
        and a.member_id = task_work_logs.member_id
    )
  );
