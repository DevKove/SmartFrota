-- Do not reassign a vehicle to another secretariat after operational history exists.
-- A dedicated transfer workflow must handle historical ownership explicitly.
CREATE OR REPLACE FUNCTION public.prevent_vehicle_secretaria_change_with_history()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $function$
BEGIN
  IF NEW.secretaria_id IS NOT DISTINCT FROM OLD.secretaria_id THEN
    RETURN NEW;
  END IF;

  IF EXISTS (SELECT 1 FROM public.work_orders WHERE vehicle_id = OLD.id)
     OR EXISTS (SELECT 1 FROM public.fuel_records WHERE vehicle_id = OLD.id)
     OR EXISTS (SELECT 1 FROM public.inspections WHERE vehicle_id = OLD.id)
     OR EXISTS (SELECT 1 FROM public.incidents WHERE vehicle_id = OLD.id)
     OR EXISTS (SELECT 1 FROM public.maintenance_plans WHERE vehicle_id = OLD.id)
     OR EXISTS (SELECT 1 FROM public.financial_transactions WHERE vehicle_id = OLD.id)
     OR EXISTS (SELECT 1 FROM public.vehicle_documents WHERE vehicle_id = OLD.id) THEN
    RAISE EXCEPTION 'vehicle secretaria cannot be changed while operational history exists'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_prevent_vehicle_secretaria_change_with_history ON public.vehicles;
CREATE TRIGGER trg_prevent_vehicle_secretaria_change_with_history
BEFORE UPDATE OF secretaria_id ON public.vehicles
FOR EACH ROW EXECUTE FUNCTION public.prevent_vehicle_secretaria_change_with_history();

REVOKE ALL ON FUNCTION public.prevent_vehicle_secretaria_change_with_history() FROM PUBLIC, anon, authenticated;
