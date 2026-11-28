ALTER TABLE public.kanban_parts
  ADD COLUMN IF NOT EXISTS is_universal boolean NOT NULL DEFAULT false;

ALTER TABLE public.kanban_parts
  ALTER COLUMN machine_id DROP NOT NULL;

COMMENT ON COLUMN public.kanban_parts.machine_id
  IS 'DEPRECATED: replaced by public.kanban_part_machines and is_universal';

CREATE TABLE public.kanban_part_machines (
  part_id uuid NOT NULL REFERENCES public.kanban_parts(id) ON DELETE CASCADE,
  machine_id uuid NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (part_id, machine_id)
);

CREATE INDEX idx_kanban_part_machines_machine_id
  ON public.kanban_part_machines (machine_id, part_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.kanban_part_machines TO authenticated;
GRANT ALL ON public.kanban_part_machines TO service_role;

ALTER TABLE public.kanban_part_machines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Maintenance and managers can select kanban part machines"
  ON public.kanban_part_machines
  FOR SELECT
  TO authenticated
  USING (
    (SELECT public.has_role((SELECT auth.uid()), 'technician'))
    OR (SELECT public.has_role((SELECT auth.uid()), 'manager'))
  );

CREATE POLICY "Maintenance and managers can insert kanban part machines"
  ON public.kanban_part_machines
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT public.has_role((SELECT auth.uid()), 'technician'))
    OR (SELECT public.has_role((SELECT auth.uid()), 'manager'))
  );

CREATE POLICY "Maintenance and managers can update kanban part machines"
  ON public.kanban_part_machines
  FOR UPDATE
  TO authenticated
  USING (
    (SELECT public.has_role((SELECT auth.uid()), 'technician'))
    OR (SELECT public.has_role((SELECT auth.uid()), 'manager'))
  )
  WITH CHECK (
    (SELECT public.has_role((SELECT auth.uid()), 'technician'))
    OR (SELECT public.has_role((SELECT auth.uid()), 'manager'))
  );

CREATE POLICY "Maintenance and managers can delete kanban part machines"
  ON public.kanban_part_machines
  FOR DELETE
  TO authenticated
  USING (
    (SELECT public.has_role((SELECT auth.uid()), 'technician'))
    OR (SELECT public.has_role((SELECT auth.uid()), 'manager'))
  );

INSERT INTO public.kanban_part_machines (part_id, machine_id)
SELECT id, machine_id
FROM public.kanban_parts
WHERE machine_id IS NOT NULL
ON CONFLICT (part_id, machine_id) DO NOTHING;