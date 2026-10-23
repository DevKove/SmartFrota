-- Escopo de secretaria para histórico operacional da frota.
-- Esta migration já está aplicada no projeto Supabase; mantida aqui para sincronização do repositório.
alter table public.suppliers add column if not exists secretaria_id uuid references public.secretarias(id);
alter table public.inventory_products add column if not exists secretaria_id uuid references public.secretarias(id);
alter table public.fuel_records add column if not exists secretaria_id uuid references public.secretarias(id);
alter table public.inspections add column if not exists secretaria_id uuid references public.secretarias(id);
alter table public.incidents add column if not exists secretaria_id uuid references public.secretarias(id);
alter table public.maintenance_plans add column if not exists secretaria_id uuid references public.secretarias(id);
alter table public.inventory_movements add column if not exists secretaria_id uuid references public.secretarias(id);

create index if not exists suppliers_secretaria_id_idx on public.suppliers(secretaria_id);
create index if not exists inventory_products_secretaria_id_idx on public.inventory_products(secretaria_id);
create index if not exists fuel_records_secretaria_id_idx on public.fuel_records(secretaria_id);
create index if not exists inspections_secretaria_id_idx on public.inspections(secretaria_id);
create index if not exists incidents_secretaria_id_idx on public.incidents(secretaria_id);
create index if not exists maintenance_plans_secretaria_id_idx on public.maintenance_plans(secretaria_id);
create index if not exists inventory_movements_secretaria_id_idx on public.inventory_movements(secretaria_id);

-- Reconstroi o escopo de registros históricos usando o veículo como fonte confiável.
update public.fuel_records r set secretaria_id=v.secretaria_id from public.vehicles v where r.vehicle_id=v.id and r.secretaria_id is distinct from v.secretaria_id;
update public.inspections r set secretaria_id=v.secretaria_id from public.vehicles v where r.vehicle_id=v.id and r.secretaria_id is distinct from v.secretaria_id;
update public.incidents r set secretaria_id=v.secretaria_id from public.vehicles v where r.vehicle_id=v.id and r.secretaria_id is distinct from v.secretaria_id;
update public.maintenance_plans r set secretaria_id=v.secretaria_id from public.vehicles v where r.vehicle_id=v.id and r.secretaria_id is distinct from v.secretaria_id;
update public.work_orders r set secretaria_id=v.secretaria_id from public.vehicles v where r.vehicle_id=v.id and r.secretaria_id is distinct from v.secretaria_id;
