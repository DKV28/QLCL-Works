-- =============================================================
-- QLCL Works — Migration 0024
-- (1) Liên kết nhân sự (members) với tài khoản đăng nhập (profiles) để
--     phục vụ mức báo cáo "chỉ cá nhân".
-- (2) Thêm resource 'report' vào role_permissions để cấu hình quyền báo cáo
--     theo vai trò: edit_scope 'all' = Đầy đủ, 'own' = Chỉ cá nhân,
--     'none' = Không có chức năng báo cáo. (can_create không dùng cho report.)
--     Quyền báo cáo được enforce ở tầng ứng dụng (báo cáo tính từ tasks vốn
--     đọc chung), không cần policy RLS mới.
-- =============================================================

-- (1) members.profile_id -----------------------------------------------------
alter table public.members
  add column if not exists profile_id uuid references public.profiles(id) on delete set null;

-- Mỗi tài khoản chỉ gắn với tối đa một nhân sự (cho phép nhiều NULL).
create unique index if not exists members_profile_id_unique
  on public.members(profile_id)
  where profile_id is not null;

-- (2) role_permissions: cho phép resource 'report' --------------------------
alter table public.role_permissions
  drop constraint if exists role_permissions_resource_check;
alter table public.role_permissions
  add constraint role_permissions_resource_check
  check (resource in ('project', 'task', 'report'));

-- Seed mặc định = Đầy đủ cho mọi vai trò (giữ nguyên hành vi hiện tại: ai cũng
-- xem được báo cáo). Admin luôn 'all' theo trigger enforce_admin_permissions.
insert into public.role_permissions (resource, role, edit_scope, can_create)
values
  ('report', 'admin',   'all', false),
  ('report', 'manager', 'all', false),
  ('report', 'staff',   'all', false)
on conflict (resource, role) do nothing;
