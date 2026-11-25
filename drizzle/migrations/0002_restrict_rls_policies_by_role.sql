-- 1. public.machines
DROP POLICY IF EXISTS "Allow all management on machines" ON public.machines;
DROP POLICY IF EXISTS "Allow all reads on machines" ON public.machines;

REVOKE ALL ON public.machines FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.machines TO authenticated;
GRANT ALL ON public.machines TO service_role;

CREATE POLICY "Authenticated staff can read machines"
ON public.machines
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role IN ('operator', 'technician', 'manager')
  )
);

CREATE POLICY "Managers can insert machines"
ON public.machines
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'manager'
  )
);

CREATE POLICY "Managers can update machines"
ON public.machines
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'manager'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'manager'
  )
);

CREATE POLICY "Managers can delete machines"
ON public.machines
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'manager'
  )
);

-- 2. public.sectors
DROP POLICY IF EXISTS "Allow all management on sectors" ON public.sectors;
DROP POLICY IF EXISTS "Allow all reads on sectors" ON public.sectors;

REVOKE ALL ON public.sectors FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sectors TO authenticated;
GRANT ALL ON public.sectors TO service_role;

CREATE POLICY "Authenticated staff can read sectors"
ON public.sectors
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role IN ('operator', 'technician', 'manager')
  )
);

CREATE POLICY "Managers can insert sectors"
ON public.sectors
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'manager'
  )
);

CREATE POLICY "Managers can update sectors"
ON public.sectors
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'manager'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'manager'
  )
);

CREATE POLICY "Managers can delete sectors"
ON public.sectors
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'manager'
  )
);

-- 3. public.maintenance_staff
DROP POLICY IF EXISTS "Allow all deletes on maintenance_staff" ON public.maintenance_staff;
DROP POLICY IF EXISTS "Allow all inserts on maintenance_staff" ON public.maintenance_staff;
DROP POLICY IF EXISTS "Allow all reads on maintenance_staff" ON public.maintenance_staff;
DROP POLICY IF EXISTS "Allow all updates on maintenance_staff" ON public.maintenance_staff;

REVOKE ALL ON public.maintenance_staff FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.maintenance_staff TO authenticated;
GRANT ALL ON public.maintenance_staff TO service_role;

CREATE POLICY "Technicians and managers can read maintenance_staff"
ON public.maintenance_staff
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role IN ('technician', 'manager')
  )
);

CREATE POLICY "Managers can insert maintenance_staff"
ON public.maintenance_staff
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'manager'
  )
);

CREATE POLICY "Managers can update maintenance_staff"
ON public.maintenance_staff
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'manager'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'manager'
  )
);

CREATE POLICY "Managers can delete maintenance_staff"
ON public.maintenance_staff
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'manager'
  )
);

-- 4. public.service_orders
DROP POLICY IF EXISTS "Allow all inserts on service_orders" ON public.service_orders;
DROP POLICY IF EXISTS "Allow all reads on service_orders" ON public.service_orders;
DROP POLICY IF EXISTS "Allow all updates on service_orders" ON public.service_orders;

REVOKE ALL ON public.service_orders FROM anon;
GRANT SELECT, INSERT, UPDATE ON public.service_orders TO authenticated;
GRANT ALL ON public.service_orders TO service_role;

CREATE POLICY "Authenticated staff can read service_orders"
ON public.service_orders
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role IN ('operator', 'technician', 'manager')
  )
);

CREATE POLICY "Authenticated staff can create service_orders"
ON public.service_orders
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role IN ('operator', 'technician', 'manager')
  )
);

CREATE POLICY "Technicians and managers can update service_orders"
ON public.service_orders
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role IN ('technician', 'manager')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role IN ('technician', 'manager')
  )
);

-- 5. public.work_logs
DROP POLICY IF EXISTS "Allow all inserts on work_logs" ON public.work_logs;
DROP POLICY IF EXISTS "Allow all reads on work_logs" ON public.work_logs;
DROP POLICY IF EXISTS "Allow all updates on work_logs" ON public.work_logs;

REVOKE ALL ON public.work_logs FROM anon;
GRANT SELECT, INSERT, UPDATE ON public.work_logs TO authenticated;
GRANT ALL ON public.work_logs TO service_role;

CREATE POLICY "Technicians and managers can read work_logs"
ON public.work_logs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role IN ('technician', 'manager')
  )
);

CREATE POLICY "Technicians and managers can insert work_logs"
ON public.work_logs
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role IN ('technician', 'manager')
  )
);

CREATE POLICY "Technicians and managers can update work_logs"
ON public.work_logs
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role IN ('technician', 'manager')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role IN ('technician', 'manager')
  )
);