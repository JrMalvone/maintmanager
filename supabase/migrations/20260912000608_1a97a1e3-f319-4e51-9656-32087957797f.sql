ALTER TABLE public.sectors
  ADD COLUMN IF NOT EXISTS work_center_electronic text,
  ADD COLUMN IF NOT EXISTS work_center_mechanical text;