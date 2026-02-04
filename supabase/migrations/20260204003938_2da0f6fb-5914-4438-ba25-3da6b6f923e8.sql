-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('operator', 'technician', 'manager');

-- Create enum for order status
CREATE TYPE public.order_status AS ENUM ('open', 'in_progress', 'closed');

-- Create enum for priority levels
CREATE TYPE public.priority_level AS ENUM ('low', 'medium', 'critical');

-- Create profiles table for user information
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    registration_number TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    UNIQUE (user_id, role)
);

-- Create sectors table
CREATE TABLE public.sectors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create machines table
CREATE TABLE public.machines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    sector_id UUID REFERENCES public.sectors(id) ON DELETE SET NULL,
    model TEXT,
    manufacturer TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create service_orders table
CREATE TABLE public.service_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    machine_id UUID REFERENCES public.machines(id) ON DELETE SET NULL,
    operator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
    technician_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    problem_description TEXT NOT NULL,
    solution_description TEXT,
    status order_status NOT NULL DEFAULT 'open',
    is_machine_stopped BOOLEAN NOT NULL DEFAULT false,
    priority priority_level NOT NULL DEFAULT 'medium',
    spare_parts_used TEXT[],
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    started_at TIMESTAMP WITH TIME ZONE,
    finished_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.machines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_orders ENABLE ROW LEVEL SECURITY;

-- Security definer function to check user role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = _user_id AND role = _role
    )
$$;

-- Security definer function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT role FROM public.user_roles
    WHERE user_id = _user_id
    LIMIT 1
$$;

-- Profiles policies
CREATE POLICY "Users can view all profiles"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (id = auth.uid());

CREATE POLICY "Users can insert own profile"
    ON public.profiles FOR INSERT
    TO authenticated
    WITH CHECK (id = auth.uid());

-- User roles policies
CREATE POLICY "Users can view own role"
    ON public.user_roles FOR SELECT
    TO authenticated
    USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'manager'));

CREATE POLICY "Managers can manage roles"
    ON public.user_roles FOR ALL
    TO authenticated
    USING (public.has_role(auth.uid(), 'manager'));

-- Sectors policies (everyone can view, managers can manage)
CREATE POLICY "Everyone can view sectors"
    ON public.sectors FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Managers can manage sectors"
    ON public.sectors FOR ALL
    TO authenticated
    USING (public.has_role(auth.uid(), 'manager'));

-- Machines policies (everyone can view, managers can manage)
CREATE POLICY "Everyone can view machines"
    ON public.machines FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Managers can manage machines"
    ON public.machines FOR ALL
    TO authenticated
    USING (public.has_role(auth.uid(), 'manager'));

-- Service orders policies
CREATE POLICY "Everyone can view service orders"
    ON public.service_orders FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Operators can create orders"
    ON public.service_orders FOR INSERT
    TO authenticated
    WITH CHECK (operator_id = auth.uid());

CREATE POLICY "Technicians and managers can update orders"
    ON public.service_orders FOR UPDATE
    TO authenticated
    USING (
        public.has_role(auth.uid(), 'technician') OR 
        public.has_role(auth.uid(), 'manager')
    );

CREATE POLICY "Managers can delete orders"
    ON public.service_orders FOR DELETE
    TO authenticated
    USING (public.has_role(auth.uid(), 'manager'));

-- Create trigger for updating profiles.updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for service_orders
ALTER PUBLICATION supabase_realtime ADD TABLE public.service_orders;

-- Insert initial sectors for the factory
INSERT INTO public.sectors (name, description) VALUES
    ('Produção', 'Área de produção principal'),
    ('Embalagem', 'Setor de embalagem e expedição'),
    ('Montagem', 'Linha de montagem'),
    ('Qualidade', 'Controle de qualidade'),
    ('Manutenção', 'Oficina de manutenção');

-- Insert sample machines
INSERT INTO public.machines (code, sector_id, model, manufacturer) 
SELECT 
    'MAQ-' || LPAD(generate_series::text, 3, '0'),
    (SELECT id FROM public.sectors ORDER BY random() LIMIT 1),
    'Model ' || chr(64 + (random() * 5 + 1)::int),
    CASE (random() * 4)::int 
        WHEN 0 THEN 'Industrial Corp'
        WHEN 1 THEN 'TechMachine'
        WHEN 2 THEN 'ProEquip'
        WHEN 3 THEN 'ManuTech'
        ELSE 'FactoryPro'
    END
FROM generate_series(1, 15);