-- Create a security definer function to get email by student_id for login
CREATE OR REPLACE FUNCTION public.get_email_by_student_id(_student_id text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email 
  FROM public.profiles 
  WHERE student_id = _student_id 
  LIMIT 1
$$;