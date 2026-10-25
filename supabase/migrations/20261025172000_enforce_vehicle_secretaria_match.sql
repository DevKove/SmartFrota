-- Enforce vehicle/secretariat consistency at the database boundary.
-- This protects partial updates and future API paths, without changing existing rows.
CREATE OR REPLACE FUNCTION public.enforce_vehicle_secretaria_match()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $function$
DECLARE
  v_secretaria_id uuid;
BEGIN
  IF NEW.vehicle_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT v.secretaria_id
    INTO v_secretaria_id
    FROM public.vehicles AS v
   WHERE v.id = NEW.vehicle_id
     AND v.deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'vehicle does not exist or is deleted'
      USING ERRCODE = '23503';
  END IF;

  IF NEW.secretaria_id IS DISTINCT FROM v_secretaria_id THEN
    RAISE EXCEPTION 'record secretaria must match the vehicle secretaria'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_work_orders_vehicle_secretaria_match ON public.work_orders;
CREATE TRIGGER trg_work_orders_vehicle_secretaria_match
BEFORE INSERT OR UPDATE OF vehicle_id, secretaria_id ON public.work_orders
FOR EACH ROW EXECUTE FUNCTION public.enforce_vehicle_secretaria_match();

DROP TRIGGER IF EXISTS trg_fuel_records_vehicle_secretaria_match ON public.fuel_records;
CREATE TRIGGER trg_fuel_records_vehicle_secretaria_match
BEFORE INSERT OR UPDATE OF vehicle_id, secretaria_id ON public.fuel_records
FOR EACH ROW EXECUTE FUNCTION public.enforce_vehicle_secretaria_match();

DROP TRIGGER IF EXISTS trg_inspections_vehicle_secretaria_match ON public.inspections;
CREATE TRIGGER trg_inspections_vehicle_secretaria_match
BEFORE INSERT OR UPDATE OF vehicle_id, secretaria_id ON public.inspections
FOR EACH ROW EXECUTE FUNCTION public.enforce_vehicle_secretaria_match();

DROP TRIGGER IF EXISTS trg_incidents_vehicle_secretaria_match ON public.incidents;
CREATE TRIGGER trg_incidents_vehicle_secretaria_match
BEFORE INSERT OR UPDATE OF vehicle_id, secretaria_id ON public.incidents
FOR EACH ROW EXECUTE FUNCTION public.enforce_vehicle_secretaria_match();

DROP TRIGGER IF EXISTS trg_maintenance_plans_vehicle_secretaria_match ON public.maintenance_plans;
CREATE TRIGGER trg_maintenance_plans_vehicle_secretaria_match
BEFORE INSERT OR UPDATE OF vehicle_id, secretaria_id ON public.maintenance_plans
FOR EACH ROW EXECUTE FUNCTION public.enforce_vehicle_secretaria_match();

REVOKE ALL ON FUNCTION public.enforce_vehicle_secretaria_match() FROM PUBLIC, anon, authenticated;
