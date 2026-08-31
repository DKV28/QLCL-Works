-- =============================================================
-- QLCL Works — Migration 0026
-- Quy trình VẬN HÀNH phi tuyến tính: thêm nhánh chuyển bước (duyệt/từ chối/
-- quay lại) thay cho luồng tuyến tính theo sort_order.
--
--  - Cập nhật danh mục bước theo email P.QLCL (18 bước, SLA mới).
--  - Thêm bảng public.workflow_transitions (các cạnh chuyển bước) để admin
--    cấu hình nhánh. Bước KHÔNG có cạnh đi ra = bước kết thúc (hiện nút
--    "Hoàn thành"). Nhánh từ chối:
--      + Từ chối yêu cầu  = điểm dừng (không có cạnh đi ra).
--      + BGĐ không duyệt  → quay về Chỉnh sửa nội dung.
--      + Từ chối trình ký → quay về Yêu cầu trình ký.
--  - Giữ FK tasks.van_hanh_step: mã cũ được TÁI DÙNG hoặc ĐỔI TÊN (on update
--    cascade tự dời các công việc đang chạy), không xóa mã đang được dùng.
-- =============================================================

-- ---------- 1) Bảng cạnh chuyển bước ----------
create table if not exists public.workflow_transitions (
  id uuid primary key default gen_random_uuid(),
  from_code text not null
    references public.workflow_step_settings(code) on update cascade on delete cascade,
  to_code text not null
    references public.workflow_step_settings(code) on update cascade on delete cascade,
  label text not null,
  kind text not null default 'forward' check (kind in ('forward','reject','back')),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (from_code, to_code)
);

create index if not exists idx_workflow_transitions_from
  on public.workflow_transitions(from_code);

drop trigger if exists trg_workflow_transitions_updated_at
  on public.workflow_transitions;
create trigger trg_workflow_transitions_updated_at
  before update on public.workflow_transitions
  for each row execute function public.set_updated_at();

alter table public.workflow_transitions enable row level security;

drop policy if exists workflow_transitions_select on public.workflow_transitions;
create policy workflow_transitions_select
  on public.workflow_transitions for select to authenticated using (true);

drop policy if exists workflow_transitions_write on public.workflow_transitions;
create policy workflow_transitions_write
  on public.workflow_transitions for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------- 2) Đổi tên mã bước cũ → mã mới tương đương ----------
-- (on update cascade sẽ dời tasks.van_hanh_step tương ứng, giữ dữ liệu in-flight)
update public.workflow_step_settings set code = 'tong_hop_gop_y'  where code = 'tong_hop_cap_ma';
update public.workflow_step_settings set code = 'cho_bgd_duyet'   where code = 'phe_duyet_noi_dung';
update public.workflow_step_settings set code = 'cho_giam_doc_ky' where code = 'trinh_ky';

-- Dời sort_order hiện có ra khỏi vùng 10..180 để tránh đụng unique index khi upsert.
update public.workflow_step_settings set sort_order = sort_order + 1000;

-- ---------- 3) Upsert 18 bước theo email ----------
-- Màu: P.QLCL #EC5AA6 (hồng) · ĐVST #1736C4 (xanh dương) ·
--      Đơn vị liên quan #4FE7AD (xanh lá) · BGĐ #FF9F70 (cam).
insert into public.workflow_step_settings
  (code, label, role_label, color, sla_days, sort_order, is_active, is_system)
values
  ('moi_tao',                'Mới tạo',                'P. QLCL',          '#EC5AA6', 0, 10,  true, true),
  ('yeu_cau_duyet',          'Yêu cầu duyệt',          'P. QLCL',          '#EC5AA6', 3, 20,  true, true),
  ('duyet_yeu_cau',          'Duyệt yêu cầu',          'P. QLCL',          '#EC5AA6', 9, 30,  true, true),
  ('tu_choi_yeu_cau',        'Từ chối yêu cầu',        'P. QLCL',          '#EC5AA6', 0, 40,  true, true),
  ('duyet_truoc_gop_y',      'Duyệt trước khi góp ý',  'P. QLCL',          '#EC5AA6', 3, 50,  true, true),
  ('gop_y',                  'Góp ý',                  'Đơn vị liên quan', '#4FE7AD', 5, 60,  true, true),
  ('tong_hop_gop_y',         'Tổng hợp góp ý',         'P. QLCL',          '#EC5AA6', 3, 70,  true, true),
  ('tiep_nhan_ra_soat',      'Tiếp nhận và rà soát',   'P. QLCL',          '#EC5AA6', 3, 80,  true, true),
  ('chinh_sua_noi_dung',     'Chỉnh sửa nội dung',     'ĐVST',             '#1736C4', 3, 90,  true, true),
  ('ra_soat_sau_chinh_sua',  'Rà soát sau chỉnh sửa',  'P. QLCL',          '#EC5AA6', 3, 100, true, true),
  ('cho_bgd_duyet',          'Chờ BGĐ duyệt',          'Phó TGĐ',          '#FF9F70', 5, 110, true, true),
  ('bgd_da_duyet',           'BGĐ đã duyệt',           'Phó TGĐ',          '#FF9F70', 3, 120, true, true),
  ('bgd_khong_duyet',        'BGĐ không duyệt',        'Phó TGĐ',          '#FF9F70', 2, 130, true, true),
  ('yeu_cau_trinh_ky',       'Yêu cầu trình ký',       'P. QLCL',          '#EC5AA6', 2, 140, true, true),
  ('xet_duyet_trinh_ky',     'Xét duyệt trình ký',     'P. QLCL',          '#EC5AA6', 2, 150, true, true),
  ('tu_choi_trinh_ky',       'Từ chối trình ký',       'P. QLCL',          '#EC5AA6', 2, 160, true, true),
  ('cho_giam_doc_ky',        'Chờ Giám đốc ký',        'Phó TGĐ',          '#FF9F70', 7, 170, true, true),
  ('ban_hanh',               'Ban hành',               'P. QLCL',          '#EC5AA6', 2, 180, true, true)
on conflict (code) do update set
  label      = excluded.label,
  role_label = excluded.role_label,
  color      = excluded.color,
  sla_days   = excluded.sla_days,
  sort_order = excluded.sort_order,
  is_active  = true,
  is_system  = true;

-- ---------- 4) Seed các cạnh chuyển bước ----------
insert into public.workflow_transitions
  (from_code, to_code, label, kind, sort_order, is_system)
values
  ('moi_tao',               'yeu_cau_duyet',         'Bước tiếp theo',      'forward', 10, true),
  ('yeu_cau_duyet',         'duyet_yeu_cau',         'Gửi duyệt',           'forward', 10, true),
  ('duyet_yeu_cau',         'duyet_truoc_gop_y',     'Duyệt',               'forward', 10, true),
  ('duyet_yeu_cau',         'tu_choi_yeu_cau',       'Từ chối',             'reject',  20, true),
  ('duyet_truoc_gop_y',     'gop_y',                 'Bước tiếp theo',      'forward', 10, true),
  ('gop_y',                 'tong_hop_gop_y',        'Bước tiếp theo',      'forward', 10, true),
  ('tong_hop_gop_y',        'tiep_nhan_ra_soat',     'Bước tiếp theo',      'forward', 10, true),
  ('tiep_nhan_ra_soat',     'chinh_sua_noi_dung',    'Bước tiếp theo',      'forward', 10, true),
  ('chinh_sua_noi_dung',    'ra_soat_sau_chinh_sua', 'Bước tiếp theo',      'forward', 10, true),
  ('ra_soat_sau_chinh_sua', 'cho_bgd_duyet',         'Trình BGĐ',           'forward', 10, true),
  ('cho_bgd_duyet',         'bgd_da_duyet',          'Duyệt',               'forward', 10, true),
  ('cho_bgd_duyet',         'bgd_khong_duyet',       'Không duyệt',         'reject',  20, true),
  ('bgd_da_duyet',          'yeu_cau_trinh_ky',      'Bước tiếp theo',      'forward', 10, true),
  ('bgd_khong_duyet',       'chinh_sua_noi_dung',    'Quay lại chỉnh sửa',  'back',    10, true),
  ('yeu_cau_trinh_ky',      'xet_duyet_trinh_ky',    'Bước tiếp theo',      'forward', 10, true),
  ('xet_duyet_trinh_ky',    'cho_giam_doc_ky',       'Duyệt',               'forward', 10, true),
  ('xet_duyet_trinh_ky',    'tu_choi_trinh_ky',      'Từ chối',             'reject',  20, true),
  ('tu_choi_trinh_ky',      'yeu_cau_trinh_ky',      'Quay lại trình ký',   'back',    10, true),
  ('cho_giam_doc_ky',       'ban_hanh',              'Bước tiếp theo',      'forward', 10, true)
on conflict (from_code, to_code) do nothing;
