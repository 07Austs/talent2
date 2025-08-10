-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Create more permissive policies for profile creation
CREATE POLICY "Enable insert for authenticated users only" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Enable select for users based on user_id" ON profiles
    FOR SELECT USING (auth.uid() = id OR 
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.id = auth.uid() 
            AND p.role IN ('recruiter', 'talent_admin', 'super_admin')
        )
    );

CREATE POLICY "Enable update for users based on user_id" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- Also fix candidates policy to be more permissive
DROP POLICY IF EXISTS "Candidates can manage own data" ON candidates;

CREATE POLICY "Enable all for candidates" ON candidates
    FOR ALL USING (
        profile_id = auth.uid() OR 
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('recruiter', 'talent_admin', 'super_admin')
        )
    );

-- Fix applications policy
DROP POLICY IF EXISTS "Users can view relevant applications" ON applications;

CREATE POLICY "Enable all for applications" ON applications
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM candidates c 
            WHERE c.id = candidate_id AND c.profile_id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM jobs j 
            WHERE j.id = job_id AND j.recruiter_id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('talent_admin', 'super_admin')
        )
    );

-- Create a function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name', COALESCE(new.raw_user_meta_data->>'role', 'candidate')::user_role);
  
  -- If the user is a candidate, also create a candidate record
  IF COALESCE(new.raw_user_meta_data->>'role', 'candidate') = 'candidate' THEN
    INSERT INTO public.candidates (profile_id, skills, ai_score)
    VALUES (new.id, '[]'::jsonb, 0.0);
  END IF;
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.profiles TO anon, authenticated;
GRANT ALL ON public.candidates TO anon, authenticated;
GRANT ALL ON public.companies TO anon, authenticated;
GRANT ALL ON public.jobs TO anon, authenticated;
GRANT ALL ON public.applications TO anon, authenticated;
GRANT ALL ON public.interviews TO anon, authenticated;
GRANT ALL ON public.audit_logs TO anon, authenticated;
GRANT ALL ON public.interview_challenges TO anon, authenticated;
