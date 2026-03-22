ALTER TABLE public.service_orders
  ADD COLUMN IF NOT EXISTS sap_sync_status text NOT NULL DEFAULT 'Pending',
  ADD COLUMN IF NOT EXISTS sap_notification_number text,
  ADD COLUMN IF NOT EXISTS sap_sync_message text;