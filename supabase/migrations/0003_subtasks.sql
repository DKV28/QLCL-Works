-- =============================================================
-- QLCL Works — Migration 0003
-- Nhiệm vụ con (subtasks) trong mỗi công việc.
-- =============================================================

create table if not exists public.subtasks (
  id          uuid primary key default gen_random_uuid(),
  task_id     uuid not null references public.tasks(id) on delete cascade,
  title       text not null,
  is_done     boolean not null default false,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

drop trigger if exists trg_subtasks_updated_at on public.subtasks;
create trigger trg_subtasks_updated_at
  before update on public.subtasks
  for each row execute function public.set_updated_at();

create index if not exists idx_subtasks_task on public.subtasks(task_id);

-- RLS — giữ mô hình V1 (cả phòng dùng chung dữ liệu)
alter table public.subtasks enable row level security;

drop policy if exists subtasks_select on public.subtasks;
create policy subtasks_select on public.subtasks
  for select to authenticated using (true);

drop policy if exists subtasks_write on public.subtasks;
create policy subtasks_write on public.subtasks
  for all to authenticated using (true) with check (true);
