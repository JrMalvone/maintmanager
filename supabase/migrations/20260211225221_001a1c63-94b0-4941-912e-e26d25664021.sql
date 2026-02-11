
-- Add status column to machines table
ALTER TABLE public.machines ADD COLUMN status text NOT NULL DEFAULT 'active';

-- Create maintenance_staff table
CREATE TABLE public.maintenance_staff (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  registration_number text NOT NULL,
  specialty text NOT NULL DEFAULT 'mechanical',
  status text NOT NULL DEFAULT 'active',
  preferred_sector_id uuid REFERENCES public.sectors(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.maintenance_staff ENABLE ROW LEVEL SECURITY;

-- RLS policies - permissive for shared login model
CREATE POLICY "Allow all reads on maintenance_staff"
  ON public.maintenance_staff FOR SELECT
  USING (true);

CREATE POLICY "Allow all inserts on maintenance_staff"
  ON public.maintenance_staff FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow all updates on maintenance_staff"
  ON public.maintenance_staff FOR UPDATE
  USING (true);

CREATE POLICY "Allow all deletes on maintenance_staff"
  ON public.maintenance_staff FOR DELETE
  USING (true);

-- Index for performance
CREATE INDEX idx_maintenance_staff_status ON public.maintenance_staff(status);
CREATE INDEX idx_machines_status ON public.machines(status);
