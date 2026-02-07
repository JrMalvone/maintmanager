-- Drop existing restrictive policies on sectors
DROP POLICY IF EXISTS "Everyone can view sectors" ON public.sectors;
DROP POLICY IF EXISTS "Managers can manage sectors" ON public.sectors;

-- Create permissive read policy for sectors (needed for shared login)
CREATE POLICY "Allow all reads on sectors" 
ON public.sectors 
FOR SELECT 
USING (true);

-- Create permissive management policy for sectors
CREATE POLICY "Allow all management on sectors" 
ON public.sectors 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Drop existing restrictive policies on machines
DROP POLICY IF EXISTS "Everyone can view machines" ON public.machines;
DROP POLICY IF EXISTS "Managers can manage machines" ON public.machines;

-- Create permissive read policy for machines (needed for shared login)
CREATE POLICY "Allow all reads on machines" 
ON public.machines 
FOR SELECT 
USING (true);

-- Create permissive management policy for machines
CREATE POLICY "Allow all management on machines" 
ON public.machines 
FOR ALL 
USING (true)
WITH CHECK (true);