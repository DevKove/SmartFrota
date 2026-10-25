-- Generate sequential, server-controlled order numbers for every new work order.
-- Existing order numbers are preserved; the sequence starts after the highest numeric value found.
CREATE SEQUENCE IF NOT EXISTS public.work_orders_order_number_seq;

DO $$
DECLARE
  highest_number bigint;
BEGIN
  SELECT COALESCE(
    MAX(NULLIF(regexp_replace(order_number, '[^0-9]', '', 'g'), '')::bigint),
    0
  )
  INTO highest_number
  FROM public.work_orders;

  IF highest_number > 0 THEN
    PERFORM setval('public.work_orders_order_number_seq', highest_number, true);
  ELSE
    PERFORM setval('public.work_orders_order_number_seq', 1, false);
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION public.assign_work_order_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  NEW.order_number := 'O.S - ' || lpad(nextval('public.work_orders_order_number_seq')::text, 4, '0');
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS trg_assign_work_order_number ON public.work_orders;
CREATE TRIGGER trg_assign_work_order_number
BEFORE INSERT ON public.work_orders
FOR EACH ROW
EXECUTE FUNCTION public.assign_work_order_number();

REVOKE ALL ON FUNCTION public.assign_work_order_number() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.assign_work_order_number() FROM anon, authenticated;
