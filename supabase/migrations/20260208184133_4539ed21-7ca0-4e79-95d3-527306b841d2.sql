-- Create work_logs table for multi-technician time tracking
CREATE TABLE public.work_logs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES public.service_orders(id) ON DELETE CASCADE,
    technician_name TEXT NOT NULL,
    technician_registry TEXT,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    ended_at TIMESTAMP WITH TIME ZONE,
    duration_minutes INTEGER,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.work_logs ENABLE ROW LEVEL SECURITY;

-- Create permissive policies (following the shared-login model)
CREATE POLICY "Allow all reads on work_logs"
ON public.work_logs
FOR SELECT
USING (true);

CREATE POLICY "Allow all inserts on work_logs"
ON public.work_logs
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow all updates on work_logs"
ON public.work_logs
FOR UPDATE
USING (true);

CREATE POLICY "Managers can delete work_logs"
ON public.work_logs
FOR DELETE
USING (public.has_role(auth.uid(), 'manager'::app_role));

-- Create index for faster lookups by order
CREATE INDEX idx_work_logs_order_id ON public.work_logs(order_id);

-- Create index for faster lookups by technician
CREATE INDEX idx_work_logs_technician ON public.work_logs(technician_name);

-- Enable realtime for work_logs
ALTER PUBLICATION supabase_realtime ADD TABLE public.work_logs;