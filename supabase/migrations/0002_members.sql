-- =============================================================
-- QLCL Works — Migration 0002
-- Danh sách Nhân sự (members) tách khỏi tài khoản đăng nhập +
-- người phụ trách chính / hỗ trợ cho công việc.
--
-- Giả định: task_assignees chưa có dữ liệu thật (app chưa go-live)
-- nên có thể tạo lại bảng an toàn.
-- =============================================================

-- -------------------------------------------------------------
-- 1. Team phân cấp: thêm parent_id (tổ trực thuộc team lớn)
-- -------------------------------------------------------------
alter table public.teams
  add column if not exists parent_id uuid references public.teams(id) on delete set null;

-- -------------------------------------------------------------
-- 2. Seed cơ cấu team/tổ (idempotent theo name)
--    Tân Bình (Ngoại trú, Nội trú - Phòng mổ), Quận 7, Quận 8
-- -------------------------------------------------------------
insert into public.teams (name)
select v.name
from (values ('Team Tân Bình'), ('Team Quận 7'), ('Team Quận 8')) as v(name)
where not exists (select 1 from public.teams t where t.name = v.name);

insert into public.teams (name, parent_id)
select v.name, (select id from public.teams where name = 'Team Tân Bình' limit 1)
from (values ('Ngoại trú'), ('Nội trú - Phòng mổ')) as v(name)
where not exists (select 1 from public.teams t where t.name = v.name);

-- -------------------------------------------------------------
-- 3. members — danh sách nhân sự (độc lập với auth/profiles)
-- -------------------------------------------------------------
create table if not exists public.members (
  id          uuid primary key default gen_random_uuid(),
  full_name   text not null,
  team_id     uuid references public.teams(id) on delete set null,
  is_active   boolean not null default true,
  note        text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

drop trigger if exists trg_members_updated_at on public.members;
create trigger trg_members_updated_at
  before update on public.members
  for each row execute function public.set_updated_at();

create index if not exists idx_members_team on public.members(team_id);

-- -------------------------------------------------------------
-- 4. task_assignees: trỏ tới members + cờ is_primary
--    (thay cho bản cũ trỏ tới profiles)
-- -------------------------------------------------------------
drop table if exists public.task_assignees;

create table public.task_assignees (
  task_id     uuid not null references public.tasks(id) on delete cascade,
  member_id   uuid not null references public.members(id) on delete cascade,
  is_primary  boolean not null default false,
  assigned_at timestamptz not null default now(),
  primary key (task_id, member_id)
);

-- Tối đa 1 người phụ trách chính mỗi công việc
create unique index task_assignees_one_primary
  on public.task_assignees(task_id)
  where is_primary;

create index idx_task_assignees_member on public.task_assignees(member_id);

-- -------------------------------------------------------------
-- 5. RLS — giữ mô hình V1 (cả phòng dùng chung dữ liệu)
-- -------------------------------------------------------------
alter table public.members        enable row level security;
alter table public.task_assignees enable row level security;

drop policy if exists members_select on public.members;
create policy members_select on public.members
  for select to authenticated using (true);

drop policy if exists members_write on public.members;
create policy members_write on public.members
  for all to authenticated using (true) with check (true);

drop policy if exists task_assignees_select on public.task_assignees;
create policy task_assignees_select on public.task_assignees
  for select to authenticated using (true);

drop policy if exists task_assignees_write on public.task_assignees;
create policy task_assignees_write on public.task_assignees
  for all to authenticated using (true) with check (true);
