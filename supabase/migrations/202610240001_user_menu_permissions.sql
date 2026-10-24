-- Permissões diretas por usuário: cada ação é concedida individualmente pelo administrador.
create table if not exists public.user_menu_permissions (
  user_id uuid not null references public.users(id) on delete cascade,
  permission_code text not null,
  granted_by uuid null references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint user_menu_permissions_permission_code_check check (
    permission_code ~ '^(vehicles|secretarias|drivers|suppliers|work_orders|maintenance|fuel|inspections|incidents|inventory|contracts|finance|reports|users):(read|create|update|delete)$'
  ),
  primary key (user_id, permission_code)
);
create index if not exists user_menu_permissions_code_idx on public.user_menu_permissions(permission_code);
alter table public.user_menu_permissions enable row level security;
-- No client-facing policies: only the trusted Edge Function service-role client manages this table.
