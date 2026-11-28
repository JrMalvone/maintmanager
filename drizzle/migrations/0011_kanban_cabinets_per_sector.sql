CREATE TABLE public.kanban_cabinets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sector_id uuid NOT NULL REFERENCES public.sectors(id) ON DELETE RESTRICT,
  name text NOT NULL,
  location text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.kanban_cabinets TO authenticated;
GRANT ALL ON public.kanban_cabinets TO service_role;

ALTER TABLE public.kanban_cabinets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Maintenance and managers can select kanban cabinets"
  ON public.kanban_cabinets FOR SELECT TO authenticated
  USING (
    (SELECT public.has_role((SELECT auth.uid()), 'technician'))
    OR (SELECT public.has_role((SELECT auth.uid()), 'manager'))
  );

CREATE POLICY "Maintenance and managers can insert kanban cabinets"
  ON public.kanban_cabinets FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT public.has_role((SELECT auth.uid()), 'technician'))
    OR (SELECT public.has_role((SELECT auth.uid()), 'manager'))
  );

CREATE POLICY "Maintenance and managers can update kanban cabinets"
  ON public.kanban_cabinets FOR UPDATE TO authenticated
  USING (
    (SELECT public.has_role((SELECT auth.uid()), 'technician'))
    OR (SELECT public.has_role((SELECT auth.uid()), 'manager'))
  )
  WITH CHECK (
    (SELECT public.has_role((SELECT auth.uid()), 'technician'))
    OR (SELECT public.has_role((SELECT auth.uid()), 'manager'))
  );

CREATE POLICY "Maintenance and managers can delete kanban cabinets"
  ON public.kanban_cabinets FOR DELETE TO authenticated
  USING (
    (SELECT public.has_role((SELECT auth.uid()), 'technician'))
    OR (SELECT public.has_role((SELECT auth.uid()), 'manager'))
  );

CREATE INDEX kanban_cabinets_sector_id_idx
  ON public.kanban_cabinets (sector_id);

CREATE UNIQUE INDEX kanban_cabinets_sector_name_uidx
  ON public.kanban_cabinets (sector_id, lower(btrim(name)));

CREATE TRIGGER update_kanban_cabinets_updated_at
  BEFORE UPDATE ON public.kanban_cabinets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.kanban_parts
  ADD COLUMN IF NOT EXISTS cabinet_id uuid REFERENCES public.kanban_cabinets(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS kanban_parts_cabinet_id_idx
  ON public.kanban_parts (cabinet_id);

INSERT INTO public.kanban_cabinets (sector_id, name, location)
SELECT DISTINCT p.sector_id, 'Kanban Geral', 'Armário principal do setor'
FROM public.kanban_parts p
WHERE p.sector_id IS NOT NULL
  AND p.cabinet_id IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.kanban_cabinets c
    WHERE c.sector_id = p.sector_id
      AND lower(btrim(c.name)) = 'kanban geral'
  );

UPDATE public.kanban_parts p
SET cabinet_id = (
  SELECT c.id
  FROM public.kanban_cabinets c
  WHERE c.sector_id = p.sector_id
  ORDER BY c.created_at ASC
  LIMIT 1
)
WHERE p.cabinet_id IS NULL
  AND p.sector_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.validate_kanban_cabinet()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF NULLIF(BTRIM(COALESCE(NEW.name, '')), '') IS NULL THEN
    RAISE EXCEPTION 'Informe o nome do armário (Kanban)';
  END IF;
  NEW.name := BTRIM(NEW.name);
  NEW.location := NULLIF(BTRIM(COALESCE(NEW.location, '')), '');

  IF TG_OP = 'UPDATE'
     AND OLD.sector_id IS DISTINCT FROM NEW.sector_id
     AND EXISTS (SELECT 1 FROM public.kanban_parts WHERE cabinet_id = NEW.id) THEN
    RAISE EXCEPTION 'Não é possível alterar o setor de um armário que já possui peças cadastradas';
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS validate_kanban_cabinet ON public.kanban_cabinets;
CREATE TRIGGER validate_kanban_cabinet
  BEFORE INSERT OR UPDATE ON public.kanban_cabinets
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_kanban_cabinet();

CREATE OR REPLACE FUNCTION public.validate_kanban_sector()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  v_cabinet_sector uuid;
BEGIN
  IF NEW.cabinet_id IS NULL THEN
    RAISE EXCEPTION 'Selecione o armário (Kanban) da peça';
  END IF;

  SELECT sector_id INTO v_cabinet_sector
  FROM public.kanban_cabinets
  WHERE id = NEW.cabinet_id;

  IF v_cabinet_sector IS NULL THEN
    RAISE EXCEPTION 'Armário (Kanban) não encontrado';
  END IF;

  IF NEW.sector_id IS NOT NULL AND NEW.sector_id IS DISTINCT FROM v_cabinet_sector THEN
    RAISE EXCEPTION 'O armário selecionado não pertence ao setor informado';
  END IF;

  NEW.sector_id := v_cabinet_sector;

  IF TG_OP = 'UPDATE' AND OLD.sector_id IS NOT NULL AND NEW.sector_id IS DISTINCT FROM OLD.sector_id THEN
    RAISE EXCEPTION 'O setor de um estoque existente não pode ser alterado. Cadastre a peça em um armário do outro setor.';
  END IF;

  IF NEW.machine_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.machines WHERE id = NEW.machine_id AND sector_id = NEW.sector_id
  ) THEN
    RAISE EXCEPTION 'O equipamento deve pertencer ao setor do armário';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.kanban_part_machines l
    JOIN public.machines m ON m.id = l.machine_id
    WHERE l.part_id = NEW.id
      AND m.sector_id IS DISTINCT FROM NEW.sector_id
  ) THEN
    RAISE EXCEPTION 'Todos os equipamentos vinculados devem pertencer ao setor do armário';
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.validate_kanban_consumption_sector()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  p public.kanban_parts;
  v_cabinet_sector uuid;
  order_sector uuid;
  order_machine uuid;
BEGIN
  IF NEW.movement_type <> 'consumption' THEN
    RETURN NEW;
  END IF;

  SELECT * INTO p FROM public.kanban_parts WHERE id = NEW.part_id;

  SELECT sector_id INTO v_cabinet_sector
  FROM public.kanban_cabinets
  WHERE id = p.cabinet_id;

  IF NEW.order_type = 'corrective' THEN
    SELECT m.sector_id, o.machine_id
      INTO order_sector, order_machine
    FROM public.service_orders o
    LEFT JOIN public.machines m ON m.id = o.machine_id
    WHERE o.id = NEW.corrective_order_id;
  ELSE
    SELECT o.sector_id, o.machine_id
      INTO order_sector, order_machine
    FROM public.preventive_backlog_orders o
    WHERE o.id = NEW.preventive_order_id
      AND o.order_type = NEW.order_type;
  END IF;

  IF order_sector IS NULL OR v_cabinet_sector IS DISTINCT FROM order_sector OR p.sector_id IS DISTINCT FROM order_sector THEN
    RAISE EXCEPTION 'A peça deve ser retirada de um armário (Kanban) do setor da ordem';
  END IF;

  IF NOT p.is_universal
     AND NOT EXISTS (
       SELECT 1 FROM public.kanban_part_machines WHERE part_id = p.id AND machine_id = order_machine
     )
     AND p.machine_id IS DISTINCT FROM order_machine THEN
    RAISE EXCEPTION 'Peça não vinculada ao equipamento da ordem';
  END IF;

  RETURN NEW;
END;
$function$;