-- First, let's ensure we have the proper structure and permissions

-- Make sure the profiles table has the correct structure
ALTER TABLE profiles 
  ALTER COLUMN id SET DEFAULT gen_random_uuid(),
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN updated_at SET DEFAULT now();

-- Make sure the candidates table has the correct structure  
ALTER TABLE candidates 
  ALTER COLUMN id SET DEFAULT gen_random_uuid(),
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN updated_at SET DEFAULT now(),
  ALTER COLUMN skills SET DEFAULT '[]'::jsonb,
  ALTER COLUMN ai_score SET DEFAULT 0.0;

-- Create a function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Insert into profiles table
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'candidate')::user_role
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    role = COALESCE(EXCLUDED.role, profiles.role),
    updated_at = now();

  -- If the user is a candidate, also create a candidate record
  IF COALESCE(NEW.raw_user_meta_data->>'role', 'candidate') = 'candidate' THEN
    INSERT INTO public.candidates (profile_id, skills, ai_score)
    VALUES (NEW.id, '[]'::jsonb, 0.0)
    ON CONFLICT (profile_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop the trigger if it exists and recreate it
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- Make sure RLS policies allow the operations we need
-- Update the profiles policies to be more permissive for new user creation
DROP POLICY IF EXISTS "Profiles: Enable insert for authenticated users only" ON profiles;
CREATE POLICY "Profiles: Enable insert for authenticated users only" ON profiles
    FOR INSERT WITH CHECK (
        auth.uid() = id OR 
        auth.role() = 'service_role'
    );

-- Update candidates policy to allow creation during signup
DROP POLICY IF EXISTS "Candidates: Enable insert for authenticated users only" ON candidates;
CREATE POLICY "Candidates: Enable insert for authenticated users only" ON candidates
    FOR INSERT WITH CHECK (
        auth.uid() = profile_id OR 
        auth.role() = 'service_role'
    );

-- Add a policy to allow reading your own profile during the signup process
DROP POLICY IF EXISTS "Profiles: Enable read for own profile" ON profiles;
CREATE POLICY "Profiles: Enable read for own profile" ON profiles
    FOR SELECT USING (
        auth.uid() = id OR 
        auth.role() = 'authenticated'
    );
