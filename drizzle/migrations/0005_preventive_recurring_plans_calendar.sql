CREATE TABLE public.preventive_plans (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 sector_id uuid REFERENCES public.sectors(id), machine_id uuid REFERENCES public.machines(id), machine_number text,
 title text NOT NULL, description text NOT NULL, maintenance_type text NOT NULL,
 priority text NOT NULL DEFAULT 'medium', materials_needed text, estimated_minutes integer,
 opener_name text NOT NULL, opener_registry text NOT NULL, work_center text,
 periodicity text NOT NULL DEFAULT 'once' CHECK (periodicity IN ('once','weekly','fortnightly','monthly','bimonthly','quarterly','semiannual','annual')),
 next_due_date date NOT NULL, active boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.preventive_plans TO authenticated;
GRANT ALL ON public.preventive_plans TO service_role;
ALTER TABLE public.preventive_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY preventive_plans_select ON public.preventive_plans FOR SELECT TO authenticated USING ((select public.has_role((select auth.uid()),'operator')) OR (select public.has_role((select auth.uid()),'technician')) OR (select public.has_role((select auth.uid()),'manager')));
CREATE POLICY preventive_plans_insert ON public.preventive_plans FOR INSERT TO authenticated WITH CHECK ((select public.has_role((select auth.uid()),'operator')) OR (select public.has_role((select auth.uid()),'technician')) OR (select public.has_role((select auth.uid()),'manager')));
CREATE POLICY preventive_plans_update ON public.preventive_plans FOR UPDATE TO authenticated USING ((select public.has_role((select auth.uid()),'technician')) OR (select public.has_role((select auth.uid()),'manager'))) WITH CHECK ((select public.has_role((select auth.uid()),'technician')) OR (select public.has_role((select auth.uid()),'manager')));
CREATE POLICY preventive_plans_delete ON public.preventive_plans FOR DELETE TO authenticated USING ((select public.has_role((select auth.uid()),'manager')));
CREATE INDEX preventive_plans_sector_idx ON public.preventive_plans(sector_id);
CREATE INDEX preventive_plans_machine_idx ON public.preventive_plans(machine_id);
CREATE INDEX preventive_plans_due_idx ON public.preventive_plans(next_due_date) WHERE active;
ALTER TABLE public.preventive_backlog_orders ADD COLUMN plan_id uuid REFERENCES public.preventive_plans(id) ON DELETE SET NULL, ADD COLUMN scheduled_date date, ADD COLUMN periodicity text;
CREATE INDEX preventive_orders_plan_idx ON public.preventive_backlog_orders(plan_id);
CREATE UNIQUE INDEX preventive_one_active_cycle_idx ON public.preventive_backlog_orders(plan_id) WHERE plan_id IS NOT NULL AND status IN ('pending_planning','planned','in_progress');
CREATE OR REPLACE FUNCTION public.preventive_interval_days(p text) RETURNS integer LANGUAGE sql IMMUTABLE SET search_path = public AS $$ SELECT CASE p WHEN 'weekly' THEN 7 WHEN 'fortnightly' THEN 15 WHEN 'monthly' THEN 30 WHEN 'bimonthly' THEN 60 WHEN 'quarterly' THEN 90 WHEN 'semiannual' THEN 180 WHEN 'annual' THEN 365 ELSE 0 END $$;
CREATE OR REPLACE FUNCTION public.generate_due_preventive_orders() RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p public.preventive_plans; n integer := 0;
BEGIN
 FOR p IN SELECT * FROM public.preventive_plans WHERE active AND next_due_date <= (now() AT TIME ZONE 'America/Sao_Paulo')::date + 7 ORDER BY id FOR UPDATE SKIP LOCKED LOOP
  IF NOT EXISTS (SELECT 1 FROM public.preventive_backlog_orders WHERE plan_id=p.id AND status IN ('pending_planning','planned','in_progress')) THEN
   INSERT INTO public.preventive_backlog_orders(plan_id,scheduled_date,periodicity,order_type,status,priority,maintenance_type,machine_id,machine_number,sector_id,title,description,materials_needed,estimated_minutes,opener_name,opener_registry,work_center,sap_sync_status)
   VALUES(p.id,p.next_due_date,p.periodicity,'preventive',CASE WHEN p.estimated_minutes>0 THEN 'planned' ELSE 'pending_planning' END,p.priority,p.maintenance_type,p.machine_id,p.machine_number,p.sector_id,p.title,p.description,p.materials_needed,p.estimated_minutes,p.opener_name,p.opener_registry,p.work_center,'NotApplicable');
   n := n+1;
  END IF;
 END LOOP;
 RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.generate_due_preventive_orders() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.generate_due_preventive_orders() TO service_role;
CREATE OR REPLACE FUNCTION public.sync_preventive_cycle() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE d integer;
BEGIN
 IF NEW.plan_id IS NULL OR TG_OP='INSERT' THEN RETURN NEW; END IF;
 IF NEW.status='completed' AND OLD.status IS DISTINCT FROM 'completed' THEN
  IF NEW.finished_at IS NULL THEN RAISE EXCEPTION 'Informe a data de término da preventiva'; END IF;
  SELECT public.preventive_interval_days(periodicity) INTO d FROM public.preventive_plans WHERE id=NEW.plan_id;
  UPDATE public.preventive_plans SET active=(d>0), next_due_date=(NEW.finished_at AT TIME ZONE 'America/Sao_Paulo')::date + d, updated_at=now() WHERE id=NEW.plan_id;
 ELSIF NEW.status='canceled' AND OLD.status IS DISTINCT FROM 'canceled' THEN
  UPDATE public.preventive_plans SET active=false WHERE id=NEW.plan_id;
 ELSIF NEW.status IN ('pending_planning','planned','in_progress') THEN
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
END $$;
REVOKE ALL ON FUNCTION public.sync_preventive_cycle() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER sync_preventive_cycle AFTER INSERT OR UPDATE ON public.preventive_backlog_orders FOR EACH ROW EXECUTE FUNCTION public.sync_preventive_cycle();
CREATE OR REPLACE FUNCTION public.on_preventive_plan_schedule() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 IF TG_OP='UPDATE' THEN
  IF NEW.next_due_date IS NOT DISTINCT FROM OLD.next_due_date AND NEW.active IS NOT DISTINCT FROM OLD.active THEN RETURN NEW; END IF;
  UPDATE public.preventive_backlog_orders SET scheduled_date=NEW.next_due_date,periodicity=NEW.periodicity WHERE plan_id=NEW.id AND status IN ('pending_planning','planned');
 END IF;
 IF NEW.active THEN PERFORM public.generate_due_preventive_orders(); END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.on_preventive_plan_schedule() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER on_preventive_plan_schedule AFTER INSERT OR UPDATE OF next_due_date,active ON public.preventive_plans FOR EACH ROW EXECUTE FUNCTION public.on_preventive_plan_schedule();
CREATE TRIGGER preventive_plans_updated_at BEFORE UPDATE ON public.preventive_plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
SELECT cron.schedule('preventive-daily-release','0 3 * * *','SELECT public.generate_due_preventive_orders();');