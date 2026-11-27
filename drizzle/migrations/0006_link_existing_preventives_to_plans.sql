CREATE OR REPLACE FUNCTION public.link_existing_preventive_plan() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 IF NEW.plan_id IS NULL AND NEW.order_type='preventive' AND NEW.scheduled_date IS NOT NULL AND NEW.status IN ('pending_planning','planned','in_progress') THEN
  INSERT INTO public.preventive_plans(sector_id,machine_id,machine_number,title,description,maintenance_type,priority,materials_needed,estimated_minutes,opener_name,opener_registry,work_center,periodicity,next_due_date,active)
  VALUES(NEW.sector_id,NEW.machine_id,NEW.machine_number,NEW.title,NEW.description,NEW.maintenance_type,NEW.priority,NEW.materials_needed,NEW.estimated_minutes,NEW.opener_name,NEW.opener_registry,NEW.work_center,COALESCE(NEW.periodicity,'once'),NEW.scheduled_date,false) RETURNING id INTO NEW.plan_id;
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.link_existing_preventive_plan() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER link_existing_preventive_plan BEFORE UPDATE ON public.preventive_backlog_orders FOR EACH ROW EXECUTE FUNCTION public.link_existing_preventive_plan();
CREATE OR REPLACE FUNCTION public.activate_linked_preventive_plan() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 IF OLD.plan_id IS NULL AND NEW.plan_id IS NOT NULL THEN UPDATE public.preventive_plans SET active=true WHERE id=NEW.plan_id; END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.activate_linked_preventive_plan() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER activate_linked_preventive_plan AFTER UPDATE ON public.preventive_backlog_orders FOR EACH ROW EXECUTE FUNCTION public.activate_linked_preventive_plan();
CREATE OR REPLACE FUNCTION public.pause_deleted_preventive_plan() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 IF OLD.plan_id IS NOT NULL AND OLD.status IN ('pending_planning','planned','in_progress') THEN UPDATE public.preventive_plans SET active=false WHERE id=OLD.plan_id; END IF;
 RETURN OLD;
END $$;
REVOKE ALL ON FUNCTION public.pause_deleted_preventive_plan() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER pause_deleted_preventive_plan BEFORE DELETE ON public.preventive_backlog_orders FOR EACH ROW EXECUTE FUNCTION public.pause_deleted_preventive_plan();