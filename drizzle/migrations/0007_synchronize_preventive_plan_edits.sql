CREATE OR REPLACE FUNCTION public.on_preventive_plan_schedule() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 IF pg_trigger_depth()>1 THEN RETURN NEW; END IF;
 IF TG_OP='UPDATE' THEN
  UPDATE public.preventive_backlog_orders SET scheduled_date=NEW.next_due_date,periodicity=NEW.periodicity,title=NEW.title,description=NEW.description,sector_id=NEW.sector_id,machine_id=NEW.machine_id,machine_number=NEW.machine_number,priority=NEW.priority,maintenance_type=NEW.maintenance_type,materials_needed=NEW.materials_needed,estimated_minutes=NEW.estimated_minutes,opener_name=NEW.opener_name,opener_registry=NEW.opener_registry,work_center=NEW.work_center,status=CASE WHEN status='pending_planning' AND NEW.estimated_minutes>0 THEN 'planned' ELSE status END WHERE plan_id=NEW.id AND status IN ('pending_planning','planned');
 END IF;
 IF NEW.active THEN PERFORM public.generate_due_preventive_orders(); END IF;
 RETURN NEW;
END $$;
DROP TRIGGER on_preventive_plan_schedule ON public.preventive_plans;
CREATE TRIGGER on_preventive_plan_schedule AFTER INSERT OR UPDATE ON public.preventive_plans FOR EACH ROW EXECUTE FUNCTION public.on_preventive_plan_schedule();
CREATE OR REPLACE FUNCTION public.release_after_preventive_completion() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 IF NEW.plan_id IS NOT NULL AND NEW.status='completed' AND OLD.status IS DISTINCT FROM 'completed' THEN PERFORM public.generate_due_preventive_orders(); END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.release_after_preventive_completion() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER zz_release_after_preventive_completion AFTER UPDATE ON public.preventive_backlog_orders FOR EACH ROW EXECUTE FUNCTION public.release_after_preventive_completion();