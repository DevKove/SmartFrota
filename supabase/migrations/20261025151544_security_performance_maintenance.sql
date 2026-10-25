-- Cover foreign-key columns to reduce parent-row delete/update scans and joins.
CREATE INDEX IF NOT EXISTS idx_fk_budget_sheets_created_by ON public.budget_sheets (created_by);
CREATE INDEX IF NOT EXISTS idx_fk_contracts_created_by ON public.contracts (created_by);
CREATE INDEX IF NOT EXISTS idx_fk_contracts_supplier_id ON public.contracts (supplier_id);
CREATE INDEX IF NOT EXISTS idx_fk_drivers_created_by ON public.drivers (created_by);
CREATE INDEX IF NOT EXISTS idx_fk_drivers_user_id ON public.drivers (user_id);
CREATE INDEX IF NOT EXISTS idx_fk_financial_transactions_approved_by ON public.financial_transactions (approved_by);
CREATE INDEX IF NOT EXISTS idx_fk_financial_transactions_budget_sheet_id ON public.financial_transactions (budget_sheet_id);
CREATE INDEX IF NOT EXISTS idx_fk_financial_transactions_created_by ON public.financial_transactions (created_by);
CREATE INDEX IF NOT EXISTS idx_fk_financial_transactions_vehicle_id ON public.financial_transactions (vehicle_id);
CREATE INDEX IF NOT EXISTS idx_fk_financial_transactions_work_order_id ON public.financial_transactions (work_order_id);
CREATE INDEX IF NOT EXISTS idx_fk_fuel_records_created_by ON public.fuel_records (created_by);
CREATE INDEX IF NOT EXISTS idx_fk_fuel_records_driver_id ON public.fuel_records (driver_id);
CREATE INDEX IF NOT EXISTS idx_fk_fuel_records_supplier_id ON public.fuel_records (supplier_id);
CREATE INDEX IF NOT EXISTS idx_fk_incidents_created_by ON public.incidents (created_by);
CREATE INDEX IF NOT EXISTS idx_fk_incidents_driver_id ON public.incidents (driver_id);
CREATE INDEX IF NOT EXISTS idx_fk_inspections_created_by ON public.inspections (created_by);
CREATE INDEX IF NOT EXISTS idx_fk_inspections_driver_id ON public.inspections (driver_id);
CREATE INDEX IF NOT EXISTS idx_fk_inventory_movements_created_by ON public.inventory_movements (created_by);
CREATE INDEX IF NOT EXISTS idx_fk_inventory_movements_work_order_id ON public.inventory_movements (work_order_id);
CREATE INDEX IF NOT EXISTS idx_fk_inventory_products_created_by ON public.inventory_products (created_by);
CREATE INDEX IF NOT EXISTS idx_fk_maintenance_plans_created_by ON public.maintenance_plans (created_by);
CREATE INDEX IF NOT EXISTS idx_fk_maintenance_plans_vehicle_id ON public.maintenance_plans (vehicle_id);
CREATE INDEX IF NOT EXISTS idx_fk_role_permissions_permission_id ON public.role_permissions (permission_id);
CREATE INDEX IF NOT EXISTS idx_fk_suppliers_created_by ON public.suppliers (created_by);
CREATE INDEX IF NOT EXISTS idx_fk_sync_conflicts_operation_id ON public.sync_conflicts (operation_id);
CREATE INDEX IF NOT EXISTS idx_fk_sync_conflicts_resolved_by ON public.sync_conflicts (resolved_by);
CREATE INDEX IF NOT EXISTS idx_fk_sync_operations_source_user_id ON public.sync_operations (source_user_id);
CREATE INDEX IF NOT EXISTS idx_fk_user_menu_permissions_granted_by ON public.user_menu_permissions (granted_by);
CREATE INDEX IF NOT EXISTS idx_fk_user_roles_role_id ON public.user_roles (role_id);
CREATE INDEX IF NOT EXISTS idx_fk_user_secretarias_secretaria_id ON public.user_secretarias (secretaria_id);
CREATE INDEX IF NOT EXISTS idx_fk_users_created_by ON public.users (created_by);
CREATE INDEX IF NOT EXISTS idx_fk_vehicle_documents_created_by ON public.vehicle_documents (created_by);
CREATE INDEX IF NOT EXISTS idx_fk_vehicle_documents_vehicle_id ON public.vehicle_documents (vehicle_id);
CREATE INDEX IF NOT EXISTS idx_fk_vehicles_created_by ON public.vehicles (created_by);
CREATE INDEX IF NOT EXISTS idx_fk_vehicles_updated_by ON public.vehicles (updated_by);
CREATE INDEX IF NOT EXISTS idx_fk_work_orders_approved_by ON public.work_orders (approved_by);
CREATE INDEX IF NOT EXISTS idx_fk_work_orders_assigned_to ON public.work_orders (assigned_to);
CREATE INDEX IF NOT EXISTS idx_fk_work_orders_requested_by ON public.work_orders (requested_by);

-- Opportunistic cleanup: old rate-limit buckets expire after 7 days.
-- Cleanup runs infrequently, based on the first byte of the SHA-256 bucket key.
CREATE OR REPLACE FUNCTION public.consume_api_rate_limit(
  p_bucket_key text,
  p_limit integer,
  p_window_seconds integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_count integer;
BEGIN
  IF p_bucket_key IS NULL OR length(p_bucket_key) <> 64
     OR p_limit < 1 OR p_limit > 1000
     OR p_window_seconds < 1 OR p_window_seconds > 86400
     OR p_bucket_key !~ '^[0-9a-fA-F]{64}$' THEN
    RAISE EXCEPTION 'invalid rate limit arguments';
  END IF;

  IF get_byte(decode(left(p_bucket_key, 2), 'hex'), 0) = 0 THEN
    DELETE FROM public.api_rate_limits
    WHERE updated_at < now() - interval '7 days';
  END IF;

  INSERT INTO public.api_rate_limits AS current_bucket
    (bucket_key, window_started_at, request_count, updated_at)
  VALUES (p_bucket_key, now(), 1, now())
  ON CONFLICT (bucket_key) DO UPDATE
    SET request_count = CASE
          WHEN current_bucket.window_started_at <= now() - make_interval(secs => p_window_seconds) THEN 1
          ELSE current_bucket.request_count + 1
        END,
        window_started_at = CASE
          WHEN current_bucket.window_started_at <= now() - make_interval(secs => p_window_seconds) THEN now()
          ELSE current_bucket.window_started_at
        END,
        updated_at = now()
  RETURNING request_count INTO v_count;

  RETURN v_count <= p_limit;
END;
$function$;

REVOKE ALL ON FUNCTION public.consume_api_rate_limit(text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_api_rate_limit(text, integer, integer) TO service_role;
