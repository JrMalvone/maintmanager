ALTER TABLE public.sectors ADD COLUMN IF NOT EXISTS shifts_count integer NOT NULL DEFAULT 3;
ALTER TABLE public.sectors ADD CONSTRAINT sectors_shifts_count_range CHECK (shifts_count BETWEEN 1 AND 3);