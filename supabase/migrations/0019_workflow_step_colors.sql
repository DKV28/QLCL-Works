-- Màu tùy chỉnh cho từng bước quy trình.
-- Bảng màu mặc định mô phỏng nhóm vai trò trong quy trình kiểm soát tài liệu.

alter table public.workflow_step_settings
  add column if not exists color text not null default '#EC5AA6';

update public.workflow_step_settings
set color = case
  when role_label = 'ĐVST' then '#1736C4'
  when role_label = 'Phó TGĐ' then '#FF9F70'
  when role_label = 'Đơn vị liên quan' then '#4FE7AD'
  else '#EC5AA6'
end
where color = '#EC5AA6';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'workflow_step_settings_color_format'
  ) then
    alter table public.workflow_step_settings
      add constraint workflow_step_settings_color_format
      check (color ~ '^#[0-9A-Fa-f]{6}$');
  end if;
end $$;

comment on column public.workflow_step_settings.color is
  'Màu hiển thị của bước quy trình, định dạng #RRGGBB.';
