-- =============================================================
-- QLCL Works — Migration 0010
-- Đánh dấu công việc "phát sinh" (ngoài kế hoạch) — phục vụ báo cáo tuần.
-- =============================================================

alter table public.tasks
  add column if not exists is_arising boolean not null default false;
