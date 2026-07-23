-- =============================================================
-- QLCL Works — Migration 0004
-- Đính kèm tệp cho công việc (Supabase Storage + bảng metadata).
-- =============================================================

-- -------------------------------------------------------------
-- Bảng metadata tệp đính kèm (trỏ tới object trong Storage)
-- -------------------------------------------------------------
create table if not exists public.attachments (
  id           uuid primary key default gen_random_uuid(),
  task_id      uuid not null references public.tasks(id) on delete cascade,
  file_name    text not null,
  storage_path text not null,
  mime_type    text,
  size_bytes   bigint,
  created_at   timestamptz not null default now()
);

create index if not exists idx_attachments_task on public.attachments(task_id);

alter table public.attachments enable row level security;

drop policy if exists attachments_select on public.attachments;
create policy attachments_select on public.attachments
  for select to authenticated using (true);

drop policy if exists attachments_write on public.attachments;
create policy attachments_write on public.attachments
  for all to authenticated using (true) with check (true);

-- -------------------------------------------------------------
-- Storage bucket riêng (private) cho tệp đính kèm công việc.
-- Xem tệp qua signed URL (không công khai).
-- -------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('task-attachments', 'task-attachments', false)
on conflict (id) do nothing;

-- Chính sách trên storage.objects (giới hạn theo bucket_id).
drop policy if exists "task_attachments_read" on storage.objects;
create policy "task_attachments_read" on storage.objects
  for select to authenticated
  using (bucket_id = 'task-attachments');

drop policy if exists "task_attachments_insert" on storage.objects;
create policy "task_attachments_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'task-attachments');

drop policy if exists "task_attachments_delete" on storage.objects;
create policy "task_attachments_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'task-attachments');
