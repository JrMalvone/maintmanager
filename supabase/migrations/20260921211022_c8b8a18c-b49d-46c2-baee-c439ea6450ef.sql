CREATE OR REPLACE FUNCTION public.set_work_log_work_center()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_specialty text;
  v_maintenance_type text;
  v_electronic_center text;
  v_mechanical_center text;
  v_resolved_center text;
BEGIN
  SELECT ms.specialty
    INTO v_specialty
  FROM public.maintenance_staff ms
  WHERE ms.registration_number = NEW.technician_registry
  ORDER BY ms.created_at DESC
  LIMIT 1;

  SELECT so.maintenance_type::text,
         NULLIF(BTRIM(s.work_center_electronic), ''),
         NULLIF(BTRIM(s.work_center_mechanical), '')
    INTO v_maintenance_type, v_electronic_center, v_mechanical_center
  FROM public.service_orders so
  LEFT JOIN public.machines m ON m.id = so.machine_id
  LEFT JOIN public.sectors s ON s.id = m.sector_id
  WHERE so.id = NEW.order_id;

  v_resolved_center := CASE
    WHEN v_specialty = 'electronic' THEN v_electronic_center
    WHEN v_specialty = 'mechanical' THEN v_mechanical_center
    WHEN v_specialty = 'both' AND v_maintenance_type = 'electronic' THEN v_electronic_center
    WHEN v_specialty = 'both' AND v_maintenance_type = 'mechanical' THEN v_mechanical_center
    ELSE NULL
  END;

  IF v_resolved_center IS NULL THEN
    RAISE EXCEPTION 'Centro de trabalho não configurado para o setor e a especialidade deste trabalhador';
  END IF;

  NEW.work_center := v_resolved_center;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.set_work_log_work_center() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_work_log_work_center() FROM anon;
REVOKE ALL ON FUNCTION public.set_work_log_work_center() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.set_work_log_work_center() TO service_role;