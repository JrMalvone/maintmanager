ALTER TABLE public.work_logs
  ADD COLUMN IF NOT EXISTS work_center text;

UPDATE public.work_logs wl
SET work_center = COALESCE(
  CASE
    WHEN (SELECT ms.specialty FROM public.maintenance_staff ms WHERE ms.registration_number = wl.technician_registry ORDER BY ms.created_at DESC LIMIT 1) = 'electronic'
      THEN NULLIF(BTRIM(s.work_center_electronic), '')
    WHEN (SELECT ms.specialty FROM public.maintenance_staff ms WHERE ms.registration_number = wl.technician_registry ORDER BY ms.created_at DESC LIMIT 1) = 'mechanical'
      THEN NULLIF(BTRIM(s.work_center_mechanical), '')
    WHEN (SELECT ms.specialty FROM public.maintenance_staff ms WHERE ms.registration_number = wl.technician_registry ORDER BY ms.created_at DESC LIMIT 1) = 'both' AND so.maintenance_type = 'electronic'
      THEN NULLIF(BTRIM(s.work_center_electronic), '')
    WHEN (SELECT ms.specialty FROM public.maintenance_staff ms WHERE ms.registration_number = wl.technician_registry ORDER BY ms.created_at DESC LIMIT 1) = 'both' AND so.maintenance_type = 'mechanical'
      THEN NULLIF(BTRIM(s.work_center_mechanical), '')
    ELSE NULL
  END,
  NULLIF(BTRIM(so.work_center), ''),
  'NAO-CONFIGURADO'
)
FROM public.service_orders so
LEFT JOIN public.machines m ON m.id = so.machine_id
LEFT JOIN public.sectors s ON s.id = m.sector_id
WHERE wl.order_id = so.id
  AND (wl.work_center IS NULL OR BTRIM(wl.work_center) = '');

UPDATE public.work_logs
SET work_center = 'NAO-CONFIGURADO'
WHERE work_center IS NULL OR BTRIM(work_center) = '';

ALTER TABLE public.work_logs
  ALTER COLUMN work_center SET NOT NULL,
  ADD CONSTRAINT work_logs_work_center_len
    CHECK (char_length(BTRIM(work_center)) BETWEEN 1 AND 40) NOT VALID;

ALTER TABLE public.work_logs VALIDATE CONSTRAINT work_logs_work_center_len;

CREATE INDEX IF NOT EXISTS idx_work_logs_work_center
  ON public.work_logs(work_center);

CREATE OR REPLACE FUNCTION public.set_work_log_work_center()
RETURNS trigger
LANGUAGE plpgsql
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

DROP TRIGGER IF EXISTS set_work_log_work_center_before_insert ON public.work_logs;
CREATE TRIGGER set_work_log_work_center_before_insert
BEFORE INSERT ON public.work_logs
FOR EACH ROW
EXECUTE FUNCTION public.set_work_log_work_center();