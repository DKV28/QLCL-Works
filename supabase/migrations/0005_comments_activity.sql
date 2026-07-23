-- =============================================================
-- QLCL Works — Migration 0005
-- Bình luận (comments) + Lịch sử hoạt động (activity_log) trên công việc.
-- =============================================================

-- -------------------------------------------------------------
-- comments — bình luận trên công việc
-- -------------------------------------------------------------
create table if not exists public.comments (
  id         uuid primary key default gen_random_uuid(),
  task_id    uuid not null references public.tasks(id) on delete cascade,
  author_id  uuid references public.profiles(id) on delete set null,
  body       text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_comments_task on public.comments(task_id);

alter table public.comments enable row level security;

drop policy if exists comments_select on public.comments;
create policy comments_select on public.comments
  for select to authenticated using (true);

drop policy if exists comments_write on public.comments;
create policy comments_write on public.comments
  for all to authenticated using (true) with check (true);

-- -------------------------------------------------------------
-- activity_log — lịch sử hoạt động (ai làm gì, khi nào)
-- -------------------------------------------------------------
create table if not exists public.activity_log (
  id         uuid primary key default gen_random_uuid(),
  task_id    uuid references public.tasks(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  actor_id   uuid references public.profiles(id) on delete set null,
  action     text not null,
  detail     text,
  created_at timestamptz not null default now()
);

create index if not exists idx_activity_task on public.activity_log(task_id);

alter table public.activity_log enable row level security;

drop policy if exists activity_select on public.activity_log;
create policy activity_select on public.activity_log
  for select to authenticated using (true);

drop policy if exists activity_insert on public.activity_log;
create policy activity_insert on public.activity_log
  for insert to authenticated with check (true);
