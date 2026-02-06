-- Add new columns to service_orders table for the role-based workflow
ALTER TABLE public.service_orders 
ADD COLUMN opener_name text,
ADD COLUMN opener_registry text,
ADD COLUMN technician_name text,
ADD COLUMN technician_registry text,
ADD COLUMN maintenance_type text CHECK (maintenance_type IN ('electronic', 'mechanical'));

-- Create index for filtering by maintenance type
CREATE INDEX idx_service_orders_maintenance_type ON public.service_orders(maintenance_type);

-- Update RLS policies to allow anonymous access for the hardcoded auth system
-- First, drop existing policies that reference auth.uid()
DROP POLICY IF EXISTS "Everyone can view service orders" ON public.service_orders;
DROP POLICY IF EXISTS "Operators can create orders" ON public.service_orders;
DROP POLICY IF EXISTS "Technicians and managers can update orders" ON public.service_orders;
DROP POLICY IF EXISTS "Managers can delete orders" ON public.service_orders;

-- Create new permissive policies for the hardcoded auth system
CREATE POLICY "Allow all reads on service_orders"
ON public.service_orders
FOR SELECT
USING (true);

CREATE POLICY "Allow all inserts on service_orders"
ON public.service_orders
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow all updates on service_orders"
ON public.service_orders
FOR UPDATE
USING (true);

CREATE POLICY "Allow all deletes on service_orders"
ON public.service_orders
FOR DELETE
USING (true);