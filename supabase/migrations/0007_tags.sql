-- =============================================================
-- QLCL Works — Migration 0007
-- Nhãn (tags) cho công việc.
-- =============================================================

create table if not exists public.tags (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  color      text not null default '#64748b',
  created_at timestamptz not null default now()
);

create table if not exists public.task_tags (
  task_id uuid not null references public.tasks(id) on delete cascade,
  tag_id  uuid not null references public.tags(id) on delete cascade,
  primary key (task_id, tag_id)
);

create index if not exists idx_task_tags_tag on public.task_tags(tag_id);

alter table public.tags      enable row level security;
alter table public.task_tags enable row level security;

drop policy if exists tags_select on public.tags;
create policy tags_select on public.tags
  for select to authenticated using (true);

drop policy if exists tags_write on public.tags;
create policy tags_write on public.tags
  for all to authenticated using (true) with check (true);

drop policy if exists task_tags_select on public.task_tags;
create policy task_tags_select on public.task_tags
  for select to authenticated using (true);

drop policy if exists task_tags_write on public.task_tags;
create policy task_tags_write on public.task_tags
  for all to authenticated using (true) with check (true);
