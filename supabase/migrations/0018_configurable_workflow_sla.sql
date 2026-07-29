-- Configurable workflow steps and SLA.
-- Existing task step codes are preserved and protected by a foreign key.

create table if not exists public.workflow_step_settings (
  code text primary key,
  label text not null,
  role_label text not null default '',
  sla_days integer not null default 1 check (sla_days >= 0 and sla_days <= 365),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workflow_step_settings_code_format
    check (code ~ '^[a-z0-9]+(?:_[a-z0-9]+)*$')
);

create unique index if not exists workflow_step_settings_sort_order_unique
  on public.workflow_step_settings(sort_order);

insert into public.workflow_step_settings
  (code, label, role_label, sla_days, sort_order, is_active, is_system)
values
  ('duyet_yeu_cau', 'Duyệt yêu cầu', 'P. QLCL', 3, 10, true, true),
  ('duyet_truoc_gop_y', 'Duyệt trước khi góp ý', 'P. QLCL', 3, 20, true, true),
  ('gop_y', 'Góp ý tài liệu', 'Đơn vị liên quan', 5, 30, true, true),
  ('tong_hop_cap_ma', 'Tổng hợp góp ý & cấp mã tài liệu', 'P. QLCL', 3, 40, true, true),
  ('chinh_sua_noi_dung', 'Chỉnh sửa nội dung', 'ĐVST', 3, 50, true, true),
  ('ra_soat_sau_chinh_sua', 'Rà soát sau chỉnh sửa', 'P. QLCL', 3, 60, true, true),
  ('phe_duyet_noi_dung', 'Phê duyệt nội dung (BGĐ)', 'Phó TGĐ', 5, 70, true, true),
  ('yeu_cau_trinh_ky', 'Yêu cầu trình ký tài liệu', 'P. QLCL', 2, 80, true, true),
  ('trinh_ky', 'Trình ký tài liệu', 'P. QLCL', 5, 90, true, true)
on conflict (code) do nothing;

drop trigger if exists trg_workflow_step_settings_updated_at
  on public.workflow_step_settings;
create trigger trg_workflow_step_settings_updated_at
  before update on public.workflow_step_settings
  for each row execute function public.set_updated_at();

alter table public.workflow_step_settings enable row level security;

create policy workflow_step_settings_select
  on public.workflow_step_settings for select to authenticated using (true);
create policy workflow_step_settings_write
  on public.workflow_step_settings for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'tasks_van_hanh_step_fkey'
  ) then
    alter table public.tasks
      add constraint tasks_van_hanh_step_fkey
      foreign key (van_hanh_step)
      references public.workflow_step_settings(code)
      on update cascade on delete restrict;
  end if;
end $$;
