-- =============================================================
-- QLCL Works — Migration 0015
-- Quy trình VẬN HÀNH (kiểm soát tài liệu theo TA2.QLCL.QT.06, mục 4.2).
-- Thêm khái niệm "bước hiện tại" cho công việc: mỗi tài liệu chạy qua các
-- bước tuần tự do P. QLCL kiểm soát, bấm "Bước tiếp theo" để tiến bước.
--
-- Thiết kế tối thiểu, cộng thêm (additive):
--   - Danh mục các bước để TRONG CODE (lib/logic/van-hanh.ts) — cố định theo
--     mục 4.2, nên không tạo bảng cấu hình và không đặt FK cho cột này.
--   - Lịch sử chuyển bước tái dùng bảng activity_log sẵn có (recordActivity).
-- =============================================================

-- null  = công việc thường (không thuộc quy trình vận hành)
-- có mã = mã bước hiện tại (vd: 'duyet_yeu_cau', 'trinh_ky'), khớp code trong
--         lib/logic/van-hanh.ts
alter table public.tasks
  add column if not exists van_hanh_step text;

comment on column public.tasks.van_hanh_step is
  'Bước hiện tại của quy trình vận hành (TA2.QLCL.QT.06 mục 4.2). null = công việc thường. Danh mục bước định nghĩa trong lib/logic/van-hanh.ts.';

create index if not exists idx_tasks_van_hanh_step
  on public.tasks(van_hanh_step)
  where van_hanh_step is not null;
