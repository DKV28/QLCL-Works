-- Notes/reasons attached to a member's task on a specific report date.

create table if not exists public.task_daily_notes (
  id          uuid primary key default gen_random_uuid(),
  task_id     uuid not null references public.tasks(id) on delete cascade,
  member_id   uuid not null references public.members(id) on delete cascade,
  note_date   date not null check (note_date <= current_date),
  note        text not null check (char_length(note) between 1 and 2000),
  created_by  uuid not null references auth.users(id) on delete restrict default auth.uid(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (task_id, member_id, note_date)
);

create index if not exists idx_task_daily_notes_member_date
  on public.task_daily_notes(member_id, note_date);

drop trigger if exists trg_task_daily_notes_updated_at
  on public.task_daily_notes;
create trigger trg_task_daily_notes_updated_at
  before update on public.task_daily_notes
  for each row execute function public.set_updated_at();

alter table public.task_daily_notes enable row level security;

drop policy if exists task_daily_notes_select on public.task_daily_notes;
create policy task_daily_notes_select on public.task_daily_notes
  for select to authenticated using (true);

drop policy if exists task_daily_notes_insert on public.task_daily_notes;
create policy task_daily_notes_insert on public.task_daily_notes
  for insert to authenticated
  with check (
    created_by = auth.uid()
    and note_date <= current_date
    and exists (
      select 1 from public.task_assignees a
      where a.task_id = task_daily_notes.task_id
        and a.member_id = task_daily_notes.member_id
    )
  );

drop policy if exists task_daily_notes_update on public.task_daily_notes;
create policy task_daily_notes_update on public.task_daily_notes
  for update to authenticated
  using (
    exists (
      select 1 from public.task_assignees a
      where a.task_id = task_daily_notes.task_id
        and a.member_id = task_daily_notes.member_id
    )
  )
  with check (
    note_date <= current_date
    and exists (
      select 1 from public.task_assignees a
      where a.task_id = task_daily_notes.task_id
        and a.member_id = task_daily_notes.member_id
    )
  );

drop policy if exists task_daily_notes_delete on public.task_daily_notes;
create policy task_daily_notes_delete on public.task_daily_notes
  for delete to authenticated
  using (
    exists (
      select 1 from public.task_assignees a
      where a.task_id = task_daily_notes.task_id
        and a.member_id = task_daily_notes.member_id
    )
  );
