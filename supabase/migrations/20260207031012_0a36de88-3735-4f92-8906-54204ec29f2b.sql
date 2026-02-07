-- Remove the foreign key constraint on operator_id since we're using shared logins
-- and operator_id is just a placeholder UUID

ALTER TABLE public.service_orders 
DROP CONSTRAINT IF EXISTS service_orders_operator_id_fkey;

-- Make operator_id nullable since it's not really used in the shared login model
ALTER TABLE public.service_orders 
ALTER COLUMN operator_id DROP NOT NULL;