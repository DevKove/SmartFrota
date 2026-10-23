-- Align operational tables with the API's soft-delete and update timestamp contract.
-- Additive-only migration: preserves existing operational data.
ALTER TABLE public.budget_sheets ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.fuel_records ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.inspections ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.inventory_products ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.maintenance_plans ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.work_orders ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.financial_transactions ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.inventory_movements ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

ALTER TABLE public.fuel_records ADD COLUMN IF NOT EXISTS updated_at timestamptz;
ALTER TABLE public.inspections ADD COLUMN IF NOT EXISTS updated_at timestamptz;
ALTER TABLE public.financial_transactions ADD COLUMN IF NOT EXISTS updated_at timestamptz;
ALTER TABLE public.inventory_movements ADD COLUMN IF NOT EXISTS updated_at timestamptz;
ALTER TABLE public.vehicle_documents ADD COLUMN IF NOT EXISTS updated_at timestamptz;

ALTER TABLE public.inventory_movements ADD COLUMN IF NOT EXISTS created_at timestamptz;
UPDATE public.inventory_movements SET created_at = occurred_at WHERE created_at IS NULL;
ALTER TABLE public.inventory_movements ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE public.fuel_records ALTER COLUMN updated_at SET DEFAULT now();
ALTER TABLE public.inspections ALTER COLUMN updated_at SET DEFAULT now();
ALTER TABLE public.financial_transactions ALTER COLUMN updated_at SET DEFAULT now();
ALTER TABLE public.inventory_movements ALTER COLUMN updated_at SET DEFAULT now();
ALTER TABLE public.vehicle_documents ALTER COLUMN updated_at SET DEFAULT now();
