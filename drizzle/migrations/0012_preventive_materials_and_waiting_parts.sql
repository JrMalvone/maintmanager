ALTER TABLE public.preventive_backlog_orders
  ADD COLUMN IF NOT EXISTS has_materials boolean,
  ADD COLUMN IF NOT EXISTS parts_expected_date date;

UPDATE public.preventive_backlog_orders
SET has_materials = true
WHERE status IN ('planned', 'in_progress', 'completed')
  AND has_materials IS NULL;

ALTER TABLE public.preventive_backlog_orders
  DROP CONSTRAINT IF EXISTS preventive_backlog_orders_status_check;

ALTER TABLE public.preventive_backlog_orders
  ADD CONSTRAINT preventive_backlog_orders_status_check
  CHECK (status = ANY (ARRAY['pending_planning'::text, 'waiting_parts'::text, 'planned'::text, 'in_progress'::text, 'completed'::text, 'canceled'::text]));

CREATE INDEX IF NOT EXISTS idx_preventive_orders_waiting_parts
  ON public.preventive_backlog_orders (parts_expected_date)
  WHERE status = 'waiting_parts';

CREATE OR REPLACE FUNCTION public.generate_due_preventive_orders()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE p public.preventive_plans; n integer := 0;
BEGIN
 FOR p IN SELECT * FROM public.preventive_plans WHERE active AND next_due_date <= (now() AT TIME ZONE 'America/Sao_Paulo')::date + 7 ORDER BY id FOR UPDATE SKIP LOCKED LOOP
  IF NOT EXISTS (SELECT 1 FROM public.preventive_backlog_orders WHERE plan_id=p.id AND status IN ('pending_planning','waiting_parts','planned','in_progress')) THEN
   INSERT INTO public.preventive_backlog_orders(plan_id,scheduled_date,periodicity,order_type,status,priority,maintenance_type,machine_id,machine_number,sector_id,title,description,materials_needed,estimated_minutes,opener_name,opener_registry,work_center,sap_sync_status)
   VALUES(p.id,p.next_due_date,p.periodicity,'preventive','pending_planning',p.priority,p.maintenance_type,p.machine_id,p.machine_number,p.sector_id,p.title,p.description,p.materials_needed,p.estimated_minutes,p.opener_name,p.opener_registry,p.work_center,'NotApplicable');
   n := n+1;
  END IF;
 END LOOP;
 RETURN n;
END $function$;

CREATE OR REPLACE FUNCTION public.on_preventive_plan_schedule()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
 IF pg_trigger_depth()>1 THEN RETURN NEW; END IF;
 IF TG_OP='UPDATE' THEN
  UPDATE public.preventive_backlog_orders
  SET scheduled_date=NEW.next_due_date,
      periodicity=NEW.periodicity,
      title=NEW.title,
      description=NEW.description,
      sector_id=NEW.sector_id,
      machine_id=NEW.machine_id,
      machine_number=NEW.machine_number,
      priority=NEW.priority,
      maintenance_type=NEW.maintenance_type,
      materials_needed=NEW.materials_needed,
      estimated_minutes=NEW.estimated_minutes,
      opener_name=NEW.opener_name,
      opener_registry=NEW.opener_registry,
      work_center=NEW.work_center
  WHERE plan_id=NEW.id AND status IN ('pending_planning','waiting_parts','planned');
 END IF;
 IF NEW.active THEN PERFORM public.generate_due_preventive_orders(); END IF;
 RETURN NEW;
END $function$;

CREATE OR REPLACE FUNCTION public.link_existing_preventive_plan()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
 IF NEW.plan_id IS NULL AND NEW.order_type='preventive' AND NEW.scheduled_date IS NOT NULL AND NEW.status IN ('pending_planning','waiting_parts','planned','in_progress') THEN
  INSERT INTO public.preventive_plans(sector_id,machine_id,machine_number,title,description,maintenance_type,priority,materials_needed,estimated_minutes,opener_name,opener_registry,work_center,periodicity,next_due_date,active)
  VALUES(NEW.sector_id,NEW.machine_id,NEW.machine_number,NEW.title,NEW.description,NEW.maintenance_type,NEW.priority,NEW.materials_needed,NEW.estimated_minutes,NEW.opener_name,NEW.opener_registry,NEW.work_center,COALESCE(NEW.periodicity,'once'),NEW.scheduled_date,false) RETURNING id INTO NEW.plan_id;
 END IF;
 RETURN NEW;
END $function$;

CREATE OR REPLACE FUNCTION public.pause_deleted_preventive_plan()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
 IF OLD.plan_id IS NOT NULL AND OLD.status IN ('pending_planning','waiting_parts','planned','in_progress') THEN UPDATE public.preventive_plans SET active=false WHERE id=OLD.plan_id; END IF;
 RETURN OLD;
END $function$;

CREATE OR REPLACE FUNCTION public.sync_preventive_cycle()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE d integer;
BEGIN
 IF NEW.plan_id IS NULL OR TG_OP='INSERT' THEN RETURN NEW; END IF;
 IF NEW.status='completed' AND OLD.status IS DISTINCT FROM 'completed' THEN
  IF NEW.finished_at IS NULL THEN RAISE EXCEPTION 'Informe a data de término da preventiva'; END IF;
  SELECT public.preventive_interval_days(periodicity) INTO d FROM public.preventive_plans WHERE id=NEW.plan_id;
  UPDATE public.preventive_plans SET active=(d>0), next_due_date=(NEW.finished_at AT TIME ZONE 'America/Sao_Paulo')::date + d, updated_at=now() WHERE id=NEW.plan_id;
 ELSIF NEW.status='canceled' AND OLD.status IS DISTINCT FROM 'canceled' THEN
  UPDATE public.preventive_plans SET active=false WHERE id=NEW.plan_id;
 ELSIF NEW.status IN ('pending_planning','waiting_parts','planned','in_progress') THEN
  IF NEW.order_type <> 'preventive' THEN
   UPDATE public.preventive_plans SET active=false WHERE id=NEW.plan_id;
  ELSE
   UPDATE public.preventive_plans SET title=NEW.title,description=NEW.description,sector_id=NEW.sector_id,machine_id=NEW.machine_id,machine_number=NEW.machine_number,priority=NEW.priority,maintenance_type=NEW.maintenance_type,materials_needed=NEW.materials_needed,estimated_minutes=NEW.estimated_minutes,opener_name=NEW.opener_name,opener_registry=NEW.opener_registry,work_center=NEW.work_center,periodicity=COALESCE(NEW.periodicity,periodicity),updated_at=now() WHERE id=NEW.plan_id;
   IF NEW.scheduled_date IS DISTINCT FROM OLD.scheduled_date AND NEW.scheduled_date IS NOT NULL THEN
    UPDATE public.preventive_plans SET next_due_date=NEW.scheduled_date WHERE id=NEW.plan_id;
   END IF;
  END IF;
 END IF;
 RETURN NEW;
END $function$;