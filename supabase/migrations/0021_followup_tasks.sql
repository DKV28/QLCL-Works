-- =============================================================
-- QLCL Works — Migration 0021
-- Sinh "việc theo dõi / đề xuất" khi hoàn thành công việc.
--
-- Khi hoàn thành một công việc (vd một bài báo cáo), có thể sinh ra các công
-- việc con để theo dõi tiếp (vd các đề xuất trong bài) với hạn = ngày hoàn
-- thành + N ngày làm việc. Mỗi việc con giữ liên kết về bài gốc (parent_task_id)
-- để còn biết "đề xuất từ bài nào".
-- =============================================================

-- Liên kết cha–con giữa các công việc. Xóa bài gốc chỉ gỡ liên kết, KHÔNG xóa
-- các việc theo dõi đã sinh (chúng có thể vẫn đang được theo dõi độc lập).
alter table public.tasks
  add column if not exists parent_task_id uuid
    references public.tasks(id) on delete set null;

create index if not exists idx_tasks_parent on public.tasks(parent_task_id);

-- Số ngày hạn cho nhiệm vụ con: có số -> khi hoàn thành bài sẽ TỰ sinh một việc
-- theo dõi với hạn = ngày hoàn thành + N ngày làm việc (trừ Chủ nhật).
-- null = không tự sinh (chỉ hiện trong hộp thoại tạo thủ công).
alter table public.subtasks
  add column if not exists followup_offset_days int;

-- Việc theo dõi đã sinh ra từ nhiệm vụ con này. Vừa là liên kết, vừa là khóa
-- chống trùng (không sinh lại khi mở lại rồi hoàn thành lại công việc).
alter table public.subtasks
  add column if not exists followup_task_id uuid
    references public.tasks(id) on delete set null;
