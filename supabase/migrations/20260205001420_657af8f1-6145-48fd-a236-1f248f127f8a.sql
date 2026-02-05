-- Add email column to profiles for login lookup
ALTER TABLE public.profiles ADD COLUMN email text;

-- Create index for faster email lookup
CREATE INDEX idx_profiles_email ON public.profiles(email);

-- Create index for faster name lookup (case-insensitive)
CREATE INDEX idx_profiles_name_lower ON public.profiles(lower(name));