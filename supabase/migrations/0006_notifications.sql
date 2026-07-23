-- =============================================================
-- QLCL Works — Migration 0006
-- Thông báo in-app (feed chung của phòng) + bật Realtime.
-- =============================================================

-- -------------------------------------------------------------
-- notifications — feed thông báo chung (mọi người thấy như nhau)
-- -------------------------------------------------------------
create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  type       text not null,
  task_id    uuid references public.tasks(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  message    text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_created on public.notifications(created_at desc);

alter table public.notifications enable row level security;

drop policy if exists notifications_select on public.notifications;
create policy notifications_select on public.notifications
  for select to authenticated using (true);

drop policy if exists notifications_insert on public.notifications;
create policy notifications_insert on public.notifications
  for insert to authenticated with check (true);

-- -------------------------------------------------------------
-- notification_seen — mốc "đã xem" theo từng tài khoản đăng nhập.
-- Chưa đọc = số thông báo có created_at > last_seen_at của user.
-- -------------------------------------------------------------
create table if not exists public.notification_seen (
  profile_id   uuid primary key references public.profiles(id) on delete cascade,
  last_seen_at timestamptz not null default now()
);

alter table public.notification_seen enable row level security;

drop policy if exists notification_seen_rw on public.notification_seen;
create policy notification_seen_rw on public.notification_seen
  for all to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

-- -------------------------------------------------------------
-- Bật Realtime cho các bảng cần cập nhật trực tiếp (idempotent).
-- -------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='tasks') then
    alter publication supabase_realtime add table public.tasks;
  end if;
  if not exists (select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='subtasks') then
    alter publication supabase_realtime add table public.subtasks;
  end if;
  if not exists (select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='notifications') then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;
