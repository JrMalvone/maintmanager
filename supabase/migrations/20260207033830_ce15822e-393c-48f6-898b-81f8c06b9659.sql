-- Fix security issues with RLS policies

-- 1. Remove the "Users can insert own role" policy that allows privilege escalation
DROP POLICY IF EXISTS "Users can insert own role" ON public.user_roles;

-- 2. Restrict profiles table - only users can view their own profile
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

CREATE POLICY "Users can view own profile only"
ON public.profiles
FOR SELECT
USING (id = auth.uid());

-- 3. Restrict service_orders DELETE to prevent data tampering
-- Only managers should be able to delete service orders
DROP POLICY IF EXISTS "Allow all deletes on service_orders" ON public.service_orders;

CREATE POLICY "Managers can delete service_orders"
ON public.service_orders
FOR DELETE
USING (public.has_role(auth.uid(), 'manager'::app_role));

-- Note: The permissive INSERT/UPDATE/SELECT policies on service_orders are intentional
-- because the app uses a shared login model where users don't have individual auth.uid()
-- The edge function now handles authentication securely