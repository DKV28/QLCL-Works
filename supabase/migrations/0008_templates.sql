-- =============================================================
-- QLCL Works — Migration 0008
-- Thư viện mẫu: đánh dấu dự án là "mẫu" (không hiện ở danh sách vận hành).
-- =============================================================

alter table public.projects
  add column if not exists is_template boolean not null default false;

create index if not exists idx_projects_is_template on public.projects(is_template);
