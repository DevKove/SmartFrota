-- The project already had a trigger that assigns sequential O.S. numbers.
-- Remove the duplicate trigger to prevent the sequence from advancing twice per insert.
DROP TRIGGER IF EXISTS trg_assign_work_order_number ON public.work_orders;
DROP FUNCTION IF EXISTS public.assign_work_order_number();

CREATE OR REPLACE FUNCTION public.generate_work_order_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.order_number := 'O.S - ' || lpad(nextval('public.work_orders_order_number_seq'::regclass)::text, 4, '0');
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.generate_work_order_number() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.generate_work_order_number() FROM anon, authenticated;
