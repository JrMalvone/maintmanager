CREATE TABLE public.preventive_backlog_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_type text NOT NULL CHECK (order_type IN ('preventive', 'backlog')),
  status text NOT NULL DEFAULT 'pending_planning' CHECK (status IN ('pending_planning', 'planned', 'in_progress', 'completed', 'canceled')),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  maintenance_type text NOT NULL CHECK (maintenance_type IN ('electronic', 'mechanical', 'metalwork', 'parts_purchase')),
  machine_id uuid REFERENCES public.machines(id) ON DELETE SET NULL,
  machine_number text,
  sector_id uuid REFERENCES public.sectors(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text NOT NULL,
  materials_needed text,
  estimated_minutes integer CHECK (estimated_minutes IS NULL OR estimated_minutes > 0),
  planned_at timestamp with time zone,
  planned_by text,
  opener_name text NOT NULL,
  opener_registry text NOT NULL,
  technician_name text,
  technician_registry text,
  solution_description text,
  spare_parts_used text[],
  started_at timestamp with time zone,
  finished_at timestamp with time zone,
  sap_sync_status text NOT NULL DEFAULT 'NotApplicable',
  sap_notification_number text,
  sap_sync_message text,
  work_center text,
  start_date_sap text,
  start_time_sap text,
  end_date_sap text,
  end_time_sap text,
  apontamentos jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.preventive_work_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.preventive_backlog_orders(id) ON DELETE CASCADE,
  technician_name text NOT NULL,
  technician_registry text,
  work_center text NOT NULL,
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  ended_at timestamp with time zone,
  duration_minutes integer,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX preventive_backlog_orders_status_created_idx ON public.preventive_backlog_orders (status, created_at DESC);
CREATE INDEX preventive_backlog_orders_machine_id_idx ON public.preventive_backlog_orders (machine_id);
CREATE INDEX preventive_backlog_orders_sector_id_idx ON public.preventive_backlog_orders (sector_id);
CREATE INDEX preventive_work_logs_order_id_idx ON public.preventive_work_logs (order_id);

CREATE TRIGGER update_preventive_backlog_orders_updated_at
  BEFORE UPDATE ON public.preventive_backlog_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.preventive_backlog_orders TO authenticated;
GRANT ALL ON public.preventive_backlog_orders TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.preventive_work_logs TO authenticated;
GRANT ALL ON public.preventive_work_logs TO service_role;

ALTER TABLE public.preventive_backlog_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.preventive_work_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated staff can read preventive_backlog_orders"
  ON public.preventive_backlog_orders
  FOR SELECT
  TO authenticated
  USING (
    (SELECT public.has_role((SELECT auth.uid()), 'operator'))
    OR (SELECT public.has_role((SELECT auth.uid()), 'technician'))
    OR (SELECT public.has_role((SELECT auth.uid()), 'manager'))
  );

CREATE POLICY "Authenticated staff can create preventive_backlog_orders"
  ON public.preventive_backlog_orders
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT public.has_role((SELECT auth.uid()), 'operator'))
    OR (SELECT public.has_role((SELECT auth.uid()), 'technician'))
    OR (SELECT public.has_role((SELECT auth.uid()), 'manager'))
  );

CREATE POLICY "Technicians and managers can update preventive_backlog_orders"
  ON public.preventive_backlog_orders
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

CREATE POLICY "Managers can delete preventive_backlog_orders"
  ON public.preventive_backlog_orders
  FOR DELETE
  TO authenticated
  USING ((SELECT public.has_role((SELECT auth.uid()), 'manager')));

CREATE POLICY "Technicians and managers can read preventive_work_logs"
  ON public.preventive_work_logs
  FOR SELECT
  TO authenticated
  USING (
    (SELECT public.has_role((SELECT auth.uid()), 'technician'))
    OR (SELECT public.has_role((SELECT auth.uid()), 'manager'))
  );

CREATE POLICY "Technicians and managers can insert preventive_work_logs"
  ON public.preventive_work_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT public.has_role((SELECT auth.uid()), 'technician'))
    OR (SELECT public.has_role((SELECT auth.uid()), 'manager'))
  );

CREATE POLICY "Technicians and managers can update preventive_work_logs"
  ON public.preventive_work_logs
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

CREATE POLICY "Managers can delete preventive_work_logs"
  ON public.preventive_work_logs
  FOR DELETE
  TO authenticated
  USING ((SELECT public.has_role((SELECT auth.uid()), 'manager')));

ALTER PUBLICATION supabase_realtime ADD TABLE public.preventive_backlog_orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.preventive_work_logs;