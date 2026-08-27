# QLCL Works — App Quản lý Dự án & Công việc (V1)

App nội bộ cho Phòng Quản lý Chất lượng (QLCL). Phiên bản **V1 — Lõi vận hành (MVP)**:
đăng nhập, quản lý dự án & công việc, đánh dấu hoàn thành nhanh, phát hiện quá hạn,
lọc, và trang quản trị người dùng.

## Công nghệ

- **Next.js 14** (App Router) + **TypeScript**
- **Tailwind CSS** cho giao diện
- **Supabase**: PostgreSQL + Auth + RLS
- Deploy: **Vercel**

Kiến trúc tách lớp:

- `lib/data/` — truy vấn Supabase (Data)
- `lib/logic/` — logic thuần: tính quá hạn, lọc, sắp xếp (Logic)
- `lib/actions/` — server actions (ghi dữ liệu)
- `app/`, `components/` — giao diện (UI)
- `supabase/migrations/` — schema database

## Cài đặt lần đầu

### 1. Tạo Supabase project

1. Tạo project mới trên [supabase.com](https://supabase.com).
2. Vào **SQL Editor**, chạy **lần lượt theo thứ tự** các file trong `supabase/migrations/`:
   - `0001_init.sql` — bảng lõi (dự án, công việc), trigger, RLS.
   - `0002_members.sql` — danh sách Nhân sự, cơ cấu team/tổ (seed sẵn 4 team + 2 tổ),
     người phụ trách chính/hỗ trợ.
   - `0003_subtasks.sql` — nhiệm vụ con.
   - `0004_attachments.sql` — tệp đính kèm + bucket Storage `task-attachments` (private).
   - `0005_comments_activity.sql` — bình luận + lịch sử hoạt động.
   - `0006_notifications.sql` — thông báo in-app + bật Realtime cho tasks/subtasks/notifications.
   - `0007_tags.sql` — nhãn (tags) cho công việc.
   - `0008_templates.sql` — thư viện mẫu (đánh dấu dự án là mẫu).
   - `0009_recurring_optional_project.sql` — dự án tùy chọn + công việc lặp lại.
   - `0010_arising.sql` — đánh dấu công việc "phát sinh" (cho báo cáo tuần).
   - `0011_workflow_settings.sql` — cấu hình mức độ quan trọng, trạng thái và siết quyền quản lý nhãn cho Quản trị.
   - `0012_dynamic_workflow_and_work_logs.sql` — trạng thái/độ ưu tiên động + nhật ký làm việc theo ngày.
   - `0013_public_staff_signup.sql` — tự đăng ký công khai luôn tạo tài khoản Thành viên; chặn tự nâng quyền.
   - `0014_task_daily_notes.sql` — ghi chú công việc theo ngày.
   - `0015_van_hanh_workflow.sql` — thêm cột `tasks.van_hanh_step` cho Quy trình vận hành
   - `0018_configurable_workflow_sla.sql` — cấu hình động các bước Quy trình vận hành và SLA theo ngày làm việc.
     (kiểm soát tài liệu theo từng bước, TA2.QLCL.QT.06 mục 4.2). Danh mục 9 bước định nghĩa
     trong `lib/logic/van-hanh.ts`; lịch sử chuyển bước dùng lại `activity_log`.
   - `0016_role_permissions.sql` — phân quyền 3 cấp trên dữ liệu vận hành: đọc dùng chung; Quản trị/Quản lý sửa mọi thứ; Thành viên chỉ sửa dự án mình sở hữu và công việc mình tạo.
   - `0017_configurable_permissions.sql` — bảng `role_permissions` để Quản trị viên tự chỉnh quyền tạo/sửa của từng vai trò trong **Cài đặt → Người dùng & phân quyền** (không cần sửa mã).
   - `0025_followup_tasks.sql` — sinh "việc theo dõi / đề xuất" khi hoàn thành công việc:
     `tasks.parent_task_id` (liên kết bài gốc) + `subtasks.followup_offset_days` (số ngày hạn)
     và `subtasks.followup_task_id` (đánh dấu đã sinh, chống trùng).
   Khi có migration mới về sau, chạy tiếp theo số thứ tự.

### 2. Cấu hình biến môi trường

Sao chép `.env.example` thành `.env.local` và điền từ **Project Settings → API**:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...   # chỉ dùng phía server, không lộ ra client
```

### 3. Tạo tài khoản admin đầu tiên

Trang quản trị chỉ dùng được khi đã có 1 admin. Tạo admin đầu tiên bằng một trong hai cách:

- **Cách A — Dashboard:** Authentication → Users → *Add user*, nhập email + mật khẩu.
  Sau đó vào SQL Editor chạy:
  ```sql
  update public.profiles set role = 'admin' where email = 'admin@benhvien.vn';
  ```
- **Cách B — SQL:** dùng cách A, chỉ khác là đặt sẵn role qua `raw_user_meta_data`.

Từ tài khoản admin này, các tài khoản còn lại được tạo ngay trong app tại
**Quản trị → Người dùng**.

### 4. Chạy local

```bash
npm install
npm run dev
```

Mở http://localhost:3000 → chuyển tới `/login`.

## Triển khai (Vercel)

1. Đẩy repo lên GitHub, import vào Vercel.
2. Thêm 3 biến môi trường ở trên vào **Vercel → Settings → Environment Variables**
   (chọn môi trường **Production**, và **Preview** nếu cần).
3. Deploy.

> ⚠️ **Bắt buộc:** phải thêm đủ biến môi trường **trước** khi build. Biến `NEXT_PUBLIC_*`
> được nhúng vào bundle lúc build, nên nếu thêm/sửa biến sau khi đã deploy thì phải
> **Redeploy** (Deployments → … → Redeploy) mới có hiệu lực.
>
> Nếu thiếu biến môi trường, app sẽ báo lỗi `500 — MIDDLEWARE_INVOCATION_FAILED` ở mọi
> trang. Khắc phục: thêm đủ 3 biến rồi redeploy.

## Chống Supabase Free tự pause

Supabase Free tự pause project sau **7 ngày không có request**. Để tránh:

1. App có sẵn endpoint `GET /api/health` (truy vấn nhẹ vào DB).
2. Tạo monitor trên [UptimeRobot](https://uptimerobot.com) (hoặc cron-job.org):
   - Kiểu: HTTP(s)
   - URL: `https://<tên-app>.vercel.app/api/health`
   - Chu kỳ: 5 phút

## Phạm vi V1 & lộ trình

V1 đã có: đăng nhập email/mật khẩu, CRUD dự án, CRUD công việc (1 người phụ trách,
deadline, mức độ quan trọng, trạng thái), hoàn thành nhanh, badge quá hạn, view Danh
sách + lọc, trang quản trị người dùng, endpoint health.

Chừa sẵn cho các phiên bản sau (theo `Plan_QLCV_QLCL.md`): bảng `task_assignees`
(multi-assignee — V2), `role`/`team_id` trên `profiles` (phân quyền RLS 3 cấp — V3),
soft delete. V2 sẽ thêm Kanban, subtask, đính kèm tệp; V3 realtime + phân quyền;
V4 báo cáo/Gantt/backup.
