-- 1) Remove policy dependencies on the SECURITY DEFINER helpers
DROP POLICY IF EXISTS "Managers can delete service_orders" ON public.service_orders;
DROP POLICY IF EXISTS "Managers can delete work_logs" ON public.work_logs;
DROP POLICY IF EXISTS "Managers can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own role" ON public.user_roles;

CREATE POLICY "Users can view own role"
ON public.user_roles FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- 2) Lock down execution of SECURITY DEFINER helper functions
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_user_role(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO service_role;

-- 3) Server-side input validation via CHECK constraints
ALTER TABLE public.service_orders
  ADD CONSTRAINT service_orders_problem_description_len
    CHECK (char_length(problem_description) BETWEEN 3 AND 2000) NOT VALID,
  ADD CONSTRAINT service_orders_solution_description_len
    CHECK (solution_description IS NULL OR char_length(solution_description) <= 2000) NOT VALID,
  ADD CONSTRAINT service_orders_opener_name_len
    CHECK (opener_name IS NULL OR char_length(opener_name) BETWEEN 2 AND 120) NOT VALID,
  ADD CONSTRAINT service_orders_opener_registry_len
    CHECK (opener_registry IS NULL OR char_length(opener_registry) BETWEEN 1 AND 40) NOT VALID,
  ADD CONSTRAINT service_orders_technician_name_len
    CHECK (technician_name IS NULL OR char_length(technician_name) BETWEEN 2 AND 120) NOT VALID,
  ADD CONSTRAINT service_orders_technician_registry_len
    CHECK (technician_registry IS NULL OR char_length(technician_registry) BETWEEN 1 AND 40) NOT VALID,
  ADD CONSTRAINT service_orders_maintenance_type_valid
    CHECK (maintenance_type IS NULL OR maintenance_type IN ('electronic','mechanical')) NOT VALID,
  ADD CONSTRAINT service_orders_work_center_len
    CHECK (work_center IS NULL OR char_length(work_center) <= 40) NOT VALID,
  ADD CONSTRAINT service_orders_machine_number_len
    CHECK (machine_number IS NULL OR char_length(machine_number) <= 40) NOT VALID,
  ADD CONSTRAINT service_orders_sap_notification_len
    CHECK (sap_notification_number IS NULL OR char_length(sap_notification_number) <= 60) NOT VALID,
  ADD CONSTRAINT service_orders_sap_sync_message_len
    CHECK (sap_sync_message IS NULL OR char_length(sap_sync_message) <= 1000) NOT VALID;

ALTER TABLE public.work_logs
  ADD CONSTRAINT work_logs_technician_name_len
    CHECK (char_length(technician_name) BETWEEN 2 AND 120) NOT VALID,
  ADD CONSTRAINT work_logs_technician_registry_len
    CHECK (technician_registry IS NULL OR char_length(technician_registry) <= 40) NOT VALID;

ALTER TABLE public.machines
  ADD CONSTRAINT machines_code_len CHECK (char_length(code) BETWEEN 1 AND 40) NOT VALID,
  ADD CONSTRAINT machines_model_len CHECK (model IS NULL OR char_length(model) <= 120) NOT VALID,
  ADD CONSTRAINT machines_manufacturer_len CHECK (manufacturer IS NULL OR char_length(manufacturer) <= 120) NOT VALID;

ALTER TABLE public.sectors
  ADD CONSTRAINT sectors_name_len CHECK (char_length(name) BETWEEN 1 AND 120) NOT VALID,
  ADD CONSTRAINT sectors_description_len CHECK (description IS NULL OR char_length(description) <= 500) NOT VALID,
  ADD CONSTRAINT sectors_wc_elt_len CHECK (work_center_electronic IS NULL OR char_length(work_center_electronic) <= 40) NOT VALID,
  ADD CONSTRAINT sectors_wc_mec_len CHECK (work_center_mechanical IS NULL OR char_length(work_center_mechanical) <= 40) NOT VALID;

ALTER TABLE public.maintenance_staff
  ADD CONSTRAINT maintenance_staff_name_len CHECK (char_length(name) BETWEEN 2 AND 120) NOT VALID,
  ADD CONSTRAINT maintenance_staff_registration_len CHECK (char_length(registration_number) BETWEEN 1 AND 40) NOT VALID;