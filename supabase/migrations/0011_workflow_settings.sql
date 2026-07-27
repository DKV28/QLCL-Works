-- =============================================================
-- QLCL Works — Migration 0011
-- Cấu hình mức độ quan trọng và trạng thái công việc.
-- Giữ mã hệ thống ổn định để tương thích dữ liệu/logic hiện có; quản trị viên
-- có thể đổi nhãn, màu, thứ tự, trạng thái hoạt động và giá trị mặc định.
-- =============================================================

create table if not exists public.task_priority_settings (
  code        text primary key
                check (code in ('cao', 'trung_binh', 'thap')),
  label       text not null,
  color       text not null,
  sort_order  integer not null default 0,
  is_active   boolean not null default true,
  is_default  boolean not null default false,
  updated_at  timestamptz not null default now()
);

create table if not exists public.task_status_settings (
  code        text primary key
                check (code in ('chua_bat_dau', 'dang_lam', 'hoan_thanh')),
  label       text not null,
  color       text not null,
  sort_order  integer not null default 0,
  is_active   boolean not null default true,
  is_default  boolean not null default false,
  is_terminal boolean not null default false,
  updated_at  timestamptz not null default now()
);

insert into public.task_priority_settings
  (code, label, color, sort_order, is_active, is_default)
values
  ('cao', 'Cao', '#ef4444', 10, true, false),
  ('trung_binh', 'Trung bình', '#f59e0b', 20, true, true),
  ('thap', 'Thấp', '#64748b', 30, true, false)
on conflict (code) do nothing;

insert into public.task_status_settings
  (code, label, color, sort_order, is_active, is_default, is_terminal)
values
  ('chua_bat_dau', 'Chưa bắt đầu', '#64748b', 10, true, true, false),
  ('dang_lam', 'Đang làm', '#3b82f6', 20, true, false, false),
  ('hoan_thanh', 'Hoàn thành', '#22c55e', 30, true, false, true)
on conflict (code) do nothing;

create unique index if not exists task_priority_settings_one_default
  on public.task_priority_settings (is_default)
  where is_default;

create unique index if not exists task_status_settings_one_default
  on public.task_status_settings (is_default)
  where is_default;

create index if not exists idx_tasks_status on public.tasks(status);
create index if not exists idx_tasks_start_date on public.tasks(start_date);

drop trigger if exists trg_task_priority_settings_updated_at
  on public.task_priority_settings;
create trigger trg_task_priority_settings_updated_at
  before update on public.task_priority_settings
  for each row execute function public.set_updated_at();

drop trigger if exists trg_task_status_settings_updated_at
  on public.task_status_settings;
create trigger trg_task_status_settings_updated_at
  before update on public.task_status_settings
  for each row execute function public.set_updated_at();

alter table public.task_priority_settings enable row level security;
alter table public.task_status_settings enable row level security;

drop policy if exists task_priority_settings_select
  on public.task_priority_settings;
create policy task_priority_settings_select
  on public.task_priority_settings
  for select to authenticated using (true);

drop policy if exists task_priority_settings_write
  on public.task_priority_settings;
create policy task_priority_settings_write
  on public.task_priority_settings
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists task_status_settings_select
  on public.task_status_settings;
create policy task_status_settings_select
  on public.task_status_settings
  for select to authenticated using (true);

drop policy if exists task_status_settings_write
  on public.task_status_settings;
create policy task_status_settings_write
  on public.task_status_settings
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Cập nhật cấu hình và đổi giá trị mặc định trong cùng một transaction/RPC,
-- tránh trạng thái trung gian không có mặc định và giảm số lượt gọi mạng.
create or replace function public.update_task_priority_setting(
  p_code text,
  p_label text,
  p_color text,
  p_sort_order integer,
  p_is_active boolean,
  p_is_default boolean
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if p_is_default then
    update public.task_priority_settings set is_default = false
    where code <> p_code and is_default;
  end if;
  update public.task_priority_settings
  set label = p_label,
      color = p_color,
      sort_order = p_sort_order,
      is_active = p_is_active or p_is_default,
      is_default = p_is_default
  where code = p_code;
end;
$$;

create or replace function public.update_task_status_setting(
  p_code text,
  p_label text,
  p_color text,
  p_sort_order integer,
  p_is_active boolean,
  p_is_default boolean
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if p_is_default then
    update public.task_status_settings set is_default = false
    where code <> p_code and is_default;
  end if;
  update public.task_status_settings
  set label = p_label,
      color = p_color,
      sort_order = p_sort_order,
      is_active = p_is_active or p_is_default,
      is_default = p_is_default
  where code = p_code;
end;
$$;

grant execute on function public.update_task_priority_setting(
  text, text, text, integer, boolean, boolean
) to authenticated;
grant execute on function public.update_task_status_setting(
  text, text, text, integer, boolean, boolean
) to authenticated;

-- Chỉ quản trị viên được quản lý danh mục nhãn. Việc gán nhãn cho công việc
-- vẫn dùng policy task_tags_write và không bị thay đổi.
drop policy if exists tags_write on public.tags;
create policy tags_write on public.tags
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
