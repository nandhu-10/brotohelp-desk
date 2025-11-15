-- Fix infinite recursion by creating separate user_roles table and security definer function

-- 1. Create enum for roles
CREATE TYPE public.app_role AS ENUM ('student', 'admin');

-- 2. Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. Create security definer function to check roles (prevents recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 4. Migrate existing role data from profiles to user_roles (convert via text)
INSERT INTO public.user_roles (user_id, role)
SELECT id, role::text::app_role FROM public.profiles
ON CONFLICT (user_id, role) DO NOTHING;

-- 5. Drop old problematic RLS policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all complaints" ON public.complaints;
DROP POLICY IF EXISTS "Admins can update all complaints" ON public.complaints;
DROP POLICY IF EXISTS "Students can view their own complaints" ON public.complaints;
DROP POLICY IF EXISTS "Students can create their own complaints" ON public.complaints;

-- 6. Create new RLS policies using security definer function
-- Profiles policies
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id);

-- Complaints policies
CREATE POLICY "Students can view their own complaints"
ON public.complaints FOR SELECT
TO authenticated
USING (student_id = auth.uid());

CREATE POLICY "Admins can view all complaints"
ON public.complaints FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Students can create complaints"
ON public.complaints FOR INSERT
TO authenticated
WITH CHECK (student_id = auth.uid());

CREATE POLICY "Admins can update all complaints"
ON public.complaints FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 7. Update the trigger function to also insert into user_roles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role_value text;
BEGIN
  -- Get role value, default to 'student'
  user_role_value := COALESCE(NEW.raw_user_meta_data->>'role', 'student');
  
  -- Insert into profiles
  INSERT INTO public.profiles (id, role, name, email, student_id, batch, phone)
  VALUES (
    NEW.id,
    user_role_value::user_role,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    NEW.email,
    NEW.raw_user_meta_data->>'student_id',
    NEW.raw_user_meta_data->>'batch',
    NEW.raw_user_meta_data->>'phone'
  );
  
  -- Insert into user_roles
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, user_role_value::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
END;
$$;