-- =============================================================
-- QLCL Works — Migration 0009
-- Dự án là tùy chọn cho công việc + trường lặp lại (recurring).
-- =============================================================

-- Dự án không còn bắt buộc
alter table public.tasks alter column project_id drop not null;

-- Lặp lại: none / daily / weekly / monthly
alter table public.tasks
  add column if not exists repeat text not null default 'none'
    check (repeat in ('none','daily','weekly','monthly'));
