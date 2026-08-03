-- Restore the administrator account after the temporary Teamlead assignment.
update public.profiles
set role = 'admin',
    team_id = null,
    updated_at = now()
where lower(email) = lower('duykyvy.ii@gmail.com');
