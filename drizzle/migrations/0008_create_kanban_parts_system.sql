CREATE TABLE public.kanban_parts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id uuid NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
  code text NOT NULL,
  description text NOT NULL,
  category text NOT NULL DEFAULT 'mechanical' CHECK (category IN ('mechanical', 'electronic')),
  target_quantity integer NOT NULL CHECK (target_quantity > 0),
  current_quantity integer NOT NULL DEFAULT 0 CHECK (current_quantity >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.kanban_parts TO authenticated;
GRANT ALL ON public.kanban_parts TO service_role;

ALTER TABLE public.kanban_parts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Maintenance and managers can select kanban parts"
ON public.kanban_parts
FOR SELECT
TO authenticated
USING (
  (select public.has_role((select auth.uid()), 'technician'))
  OR (select public.has_role((select auth.uid()), 'manager'))
);

CREATE POLICY "Maintenance and managers can insert kanban parts"
ON public.kanban_parts
FOR INSERT
TO authenticated
WITH CHECK (
  (select public.has_role((select auth.uid()), 'technician'))
  OR (select public.has_role((select auth.uid()), 'manager'))
);

CREATE POLICY "Maintenance and managers can update kanban parts"
ON public.kanban_parts
FOR UPDATE
TO authenticated
USING (
  (select public.has_role((select auth.uid()), 'technician'))
  OR (select public.has_role((select auth.uid()), 'manager'))
)
WITH CHECK (
  (select public.has_role((select auth.uid()), 'technician'))
  OR (select public.has_role((select auth.uid()), 'manager'))
);

CREATE POLICY "Maintenance and managers can delete kanban parts"
ON public.kanban_parts
FOR DELETE
TO authenticated
USING (
  (select public.has_role((select auth.uid()), 'technician'))
  OR (select public.has_role((select auth.uid()), 'manager'))
);

CREATE INDEX kanban_parts_machine_id_idx ON public.kanban_parts (machine_id);
CREATE INDEX kanban_parts_machine_category_idx ON public.kanban_parts (machine_id, category);

CREATE TRIGGER update_kanban_parts_updated_at
  BEFORE UPDATE ON public.kanban_parts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.kanban_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  part_id uuid NOT NULL REFERENCES public.kanban_parts(id) ON DELETE CASCADE,
  movement_type text NOT NULL CHECK (movement_type IN ('consumption', 'replenishment', 'reversal', 'adjustment')),
  quantity integer NOT NULL CHECK (quantity > 0),
  previous_quantity integer NOT NULL CHECK (previous_quantity >= 0),
  new_quantity integer NOT NULL CHECK (new_quantity >= 0),
  order_type text CHECK (order_type IN ('corrective', 'preventive', 'backlog')),
  corrective_order_id uuid REFERENCES public.service_orders(id) ON DELETE SET NULL,
  preventive_order_id uuid REFERENCES public.preventive_backlog_orders(id) ON DELETE SET NULL,
  actor_name text,
  notes text,
  reversed_movement_id uuid REFERENCES public.kanban_movements(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.kanban_movements TO authenticated;
GRANT ALL ON public.kanban_movements TO service_role;

ALTER TABLE public.kanban_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Maintenance and managers can select kanban movements"
ON public.kanban_movements
FOR SELECT
TO authenticated
USING (
  (select public.has_role((select auth.uid()), 'technician'))
  OR (select public.has_role((select auth.uid()), 'manager'))
);

CREATE POLICY "Maintenance and managers can insert kanban movements"
ON public.kanban_movements
FOR INSERT
TO authenticated
WITH CHECK (
  (select public.has_role((select auth.uid()), 'technician'))
  OR (select public.has_role((select auth.uid()), 'manager'))
);

CREATE INDEX kanban_movements_part_created_idx ON public.kanban_movements (part_id, created_at DESC);
CREATE INDEX kanban_movements_corrective_order_idx ON public.kanban_movements (corrective_order_id) WHERE corrective_order_id IS NOT NULL;
CREATE INDEX kanban_movements_preventive_order_idx ON public.kanban_movements (preventive_order_id) WHERE preventive_order_id IS NOT NULL;
CREATE INDEX kanban_movements_reversed_idx ON public.kanban_movements (reversed_movement_id) WHERE reversed_movement_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.record_kanban_consumption(
  p_part_id uuid,
  p_quantity integer,
  p_order_type text,
  p_order_id uuid,
  p_actor_name text DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS public.kanban_movements
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  v_part public.kanban_parts;
  v_movement public.kanban_movements;
  v_new_qty integer;
BEGIN
  IF NOT (
    public.has_role(auth.uid(), 'technician')
    OR public.has_role(auth.uid(), 'manager')
  ) THEN
    RAISE EXCEPTION 'Sem permissão para movimentar o Kanban de peças';
  END IF;

  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RAISE EXCEPTION 'Informe uma quantidade válida maior que zero';
  END IF;

  IF p_order_type NOT IN ('corrective', 'preventive', 'backlog') THEN
    RAISE EXCEPTION 'Tipo de ordem inválido';
  END IF;

  IF p_order_id IS NULL THEN
    RAISE EXCEPTION 'Ordem de serviço obrigatória para baixa de peça';
  END IF;

  SELECT * INTO v_part
  FROM public.kanban_parts
  WHERE id = p_part_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Peça não encontrada no Kanban';
  END IF;

  IF v_part.current_quantity < p_quantity THEN
    RAISE EXCEPTION 'Saldo insuficiente no Kanban (disponível: %)', v_part.current_quantity;
  END IF;

  v_new_qty := v_part.current_quantity - p_quantity;

  UPDATE public.kanban_parts
  SET current_quantity = v_new_qty
  WHERE id = p_part_id;

  INSERT INTO public.kanban_movements (
    part_id,
    movement_type,
    quantity,
    previous_quantity,
    new_quantity,
    order_type,
    corrective_order_id,
    preventive_order_id,
    actor_name,
    notes
  )
  VALUES (
    p_part_id,
    'consumption',
    p_quantity,
    v_part.current_quantity,
    v_new_qty,
    p_order_type,
    CASE WHEN p_order_type = 'corrective' THEN p_order_id ELSE NULL END,
    CASE WHEN p_order_type IN ('preventive', 'backlog') THEN p_order_id ELSE NULL END,
    NULLIF(BTRIM(COALESCE(p_actor_name, '')), ''),
    NULLIF(BTRIM(COALESCE(p_notes, '')), '')
  )
  RETURNING * INTO v_movement;

  RETURN v_movement;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.record_kanban_consumption(uuid, integer, text, uuid, text, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.record_kanban_consumption(uuid, integer, text, uuid, text, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.reverse_kanban_consumption(
  p_movement_id uuid,
  p_actor_name text DEFAULT NULL
)
RETURNS public.kanban_movements
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  v_orig public.kanban_movements;
  v_part public.kanban_parts;
  v_reversal public.kanban_movements;
  v_new_qty integer;
BEGIN
  IF NOT (
    public.has_role(auth.uid(), 'technician')
    OR public.has_role(auth.uid(), 'manager')
  ) THEN
    RAISE EXCEPTION 'Sem permissão para estornar baixa do Kanban';
  END IF;

  SELECT * INTO v_orig
  FROM public.kanban_movements
  WHERE id = p_movement_id
    AND movement_type = 'consumption'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Movimentação de consumo não encontrada';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.kanban_movements
    WHERE reversed_movement_id = p_movement_id
  ) THEN
    RAISE EXCEPTION 'Esta baixa já foi estornada';
  END IF;

  SELECT * INTO v_part
  FROM public.kanban_parts
  WHERE id = v_orig.part_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Peça não encontrada no Kanban';
  END IF;

  v_new_qty := v_part.current_quantity + v_orig.quantity;

  UPDATE public.kanban_parts
  SET current_quantity = v_new_qty
  WHERE id = v_part.id;

  INSERT INTO public.kanban_movements (
    part_id,
    movement_type,
    quantity,
    previous_quantity,
    new_quantity,
    order_type,
    corrective_order_id,
    preventive_order_id,
    actor_name,
    notes,
    reversed_movement_id
  )
  VALUES (
    v_part.id,
    'reversal',
    v_orig.quantity,
    v_part.current_quantity,
    v_new_qty,
    v_orig.order_type,
    v_orig.corrective_order_id,
    v_orig.preventive_order_id,
    NULLIF(BTRIM(COALESCE(p_actor_name, '')), ''),
    'Estorno de baixa em ordem de serviço',
    p_movement_id
  )
  RETURNING * INTO v_reversal;

  RETURN v_reversal;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.reverse_kanban_consumption(uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.reverse_kanban_consumption(uuid, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.replenish_kanban_part(
  p_part_id uuid,
  p_quantity integer,
  p_actor_name text DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS public.kanban_movements
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  v_part public.kanban_parts;
  v_movement public.kanban_movements;
  v_new_qty integer;
BEGIN
  IF NOT (
    public.has_role(auth.uid(), 'technician')
    OR public.has_role(auth.uid(), 'manager')
  ) THEN
    RAISE EXCEPTION 'Sem permissão para reabastecer o Kanban';
  END IF;

  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RAISE EXCEPTION 'Informe uma quantidade recebida maior que zero';
  END IF;

  SELECT * INTO v_part
  FROM public.kanban_parts
  WHERE id = p_part_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Peça não encontrada no Kanban';
  END IF;

  v_new_qty := v_part.current_quantity + p_quantity;

  UPDATE public.kanban_parts
  SET current_quantity = v_new_qty
  WHERE id = p_part_id;

  INSERT INTO public.kanban_movements (
    part_id,
    movement_type,
    quantity,
    previous_quantity,
    new_quantity,
    actor_name,
    notes
  )
  VALUES (
    p_part_id,
    'replenishment',
    p_quantity,
    v_part.current_quantity,
    v_new_qty,
    NULLIF(BTRIM(COALESCE(p_actor_name, '')), ''),
    NULLIF(BTRIM(COALESCE(p_notes, '')), '')
  )
  RETURNING * INTO v_movement;

  RETURN v_movement;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.replenish_kanban_part(uuid, integer, text, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.replenish_kanban_part(uuid, integer, text, text) TO authenticated, service_role;
