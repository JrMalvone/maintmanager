ALTER TABLE public.kanban_parts ADD COLUMN sector_id uuid REFERENCES public.sectors(id);
CREATE INDEX kanban_parts_sector_id_idx ON public.kanban_parts(sector_id);
UPDATE public.kanban_parts p SET sector_id = x.sector_id FROM (SELECT l.part_id, (array_agg(DISTINCT m.sector_id))[1] sector_id FROM public.kanban_part_machines l JOIN public.machines m ON m.id=l.machine_id GROUP BY l.part_id HAVING count(DISTINCT m.sector_id)=1) x WHERE p.id=x.part_id;
UPDATE public.kanban_parts p SET sector_id=m.sector_id FROM public.machines m WHERE p.machine_id=m.id AND p.sector_id IS NULL AND NOT EXISTS (SELECT 1 FROM public.kanban_part_machines l WHERE l.part_id=p.id);
COMMENT ON COLUMN public.kanban_parts.is_universal IS 'Applies to all machines in the inventory sector, not plant-wide';
CREATE OR REPLACE FUNCTION public.validate_kanban_sector() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF NEW.sector_id IS NULL THEN RAISE EXCEPTION 'Selecione o setor do Kanban'; END IF;
 IF TG_OP='UPDATE' AND OLD.sector_id IS NOT NULL AND NEW.sector_id IS DISTINCT FROM OLD.sector_id THEN RAISE EXCEPTION 'O setor de um estoque existente não pode ser alterado. Cadastre a peça no outro setor.'; END IF;
 IF NEW.machine_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.machines WHERE id=NEW.machine_id AND sector_id=NEW.sector_id) THEN RAISE EXCEPTION 'O equipamento deve pertencer ao setor do Kanban'; END IF;
 IF EXISTS(SELECT 1 FROM public.kanban_part_machines l JOIN public.machines m ON m.id=l.machine_id WHERE l.part_id=NEW.id AND m.sector_id IS DISTINCT FROM NEW.sector_id) THEN RAISE EXCEPTION 'Todos os equipamentos vinculados devem pertencer ao setor do Kanban'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER validate_kanban_sector BEFORE INSERT OR UPDATE ON public.kanban_parts FOR EACH ROW EXECUTE FUNCTION public.validate_kanban_sector();
CREATE OR REPLACE FUNCTION public.validate_kanban_machine_sector() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.kanban_parts p JOIN public.machines m ON m.sector_id=p.sector_id WHERE p.id=NEW.part_id AND m.id=NEW.machine_id) THEN RAISE EXCEPTION 'O equipamento deve pertencer ao setor do Kanban'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER validate_kanban_machine_sector BEFORE INSERT OR UPDATE ON public.kanban_part_machines FOR EACH ROW EXECUTE FUNCTION public.validate_kanban_machine_sector();
CREATE OR REPLACE FUNCTION public.validate_kanban_consumption_sector() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
DECLARE p public.kanban_parts; order_sector uuid; order_machine uuid;
BEGIN
 IF NEW.movement_type <> 'consumption' THEN RETURN NEW; END IF;
 SELECT * INTO p FROM public.kanban_parts WHERE id=NEW.part_id;
 IF NEW.order_type='corrective' THEN
 SELECT m.sector_id, o.machine_id INTO order_sector,order_machine FROM public.service_orders o LEFT JOIN public.machines m ON m.id=o.machine_id WHERE o.id=NEW.corrective_order_id;
 ELSE
 SELECT o.sector_id,o.machine_id INTO order_sector,order_machine FROM public.preventive_backlog_orders o WHERE o.id=NEW.preventive_order_id AND o.order_type=NEW.order_type;
 END IF;
 IF order_sector IS NULL OR p.sector_id IS DISTINCT FROM order_sector THEN RAISE EXCEPTION 'A peça deve ser retirada do Kanban do setor da ordem'; END IF;
 IF NOT p.is_universal AND NOT EXISTS(SELECT 1 FROM public.kanban_part_machines WHERE part_id=p.id AND machine_id=order_machine) AND p.machine_id IS DISTINCT FROM order_machine THEN RAISE EXCEPTION 'Peça não vinculada ao equipamento da ordem'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER validate_kanban_consumption_sector BEFORE INSERT ON public.kanban_movements FOR EACH ROW EXECUTE FUNCTION public.validate_kanban_consumption_sector();