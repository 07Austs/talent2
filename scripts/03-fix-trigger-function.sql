-- First, let's make sure we have the user_role enum type
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('candidate', 'recruiter', 'talent_admin', 'super_admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Drop the existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create the corrected function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    user_role_value user_role;
BEGIN
    -- Get the role from metadata, default to 'candidate'
    user_role_value := COALESCE(new.raw_user_meta_data->>'role', 'candidate')::user_role;
    
    -- Insert into profiles table
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (
        new.id, 
        new.email, 
        new.raw_user_meta_data->>'full_name', 
        user_role_value
    );
    
    -- If the user is a candidate, also create a candidate record
    IF user_role_value = 'candidate' THEN
        INSERT INTO public.candidates (profile_id, skills, ai_score)
        VALUES (new.id, '[]'::jsonb, 0.0);
    END IF;
    
    RETURN new;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error and re-raise it
        RAISE LOG 'Error in handle_new_user: %', SQLERRM;
        RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Make sure RLS is enabled on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_challenges ENABLE ROW LEVEL SECURITY;
