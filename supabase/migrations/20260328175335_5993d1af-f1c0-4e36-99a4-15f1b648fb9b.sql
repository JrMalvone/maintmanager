ALTER TABLE public.service_orders
  ADD COLUMN IF NOT EXISTS is_breakdown boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS work_center text,
  ADD COLUMN IF NOT EXISTS malf_start_date text,
  ADD COLUMN IF NOT EXISTS malf_start_time text,
  ADD COLUMN IF NOT EXISTS malf_end_date text,
  ADD COLUMN IF NOT EXISTS malf_end_time text,
  ADD COLUMN IF NOT EXISTS apontamentos jsonb DEFAULT '[]'::jsonb;