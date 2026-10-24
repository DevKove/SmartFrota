-- Preserve each existing user's effective permissions as a one-time direct-permission snapshot.
-- After this migration, access is read from user_menu_permissions, not inherited from roles.
insert into public.user_menu_permissions (user_id, permission_code, granted_by)
select distinct ur.user_id, p.code, null::uuid
from public.user_roles ur
join public.role_permissions rp on rp.role_id = ur.role_id
join public.permissions p on p.id = rp.permission_id
where p.code ~ '^(vehicles|secretarias|drivers|suppliers|work_orders|maintenance|fuel|inspections|incidents|inventory|contracts|finance|reports|users):(read|create|update|delete)$'
on conflict (user_id, permission_code) do nothing;
