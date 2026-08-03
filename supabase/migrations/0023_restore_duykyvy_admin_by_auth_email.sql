-- Idempotent fallback: use auth.users as the source of truth when the
-- profile email was not synchronized with the login email.
insert into public.profiles (id, email, full_name, role, team_id)
select u.id, u.email,
       coalesce(nullif(trim(u.raw_user_meta_data->>'full_name'), ''), u.email),
       'admin', null
from auth.users u
where lower(u.email) = lower('duykyvy.ii@gmail.com')
on conflict (id) do update
set role = 'admin',
    team_id = null,
    email = excluded.email,
    updated_at = now();
