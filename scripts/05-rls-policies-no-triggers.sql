-- Ensure the user_role enum type exists. If it already exists, this will do nothing.
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('candidate', 'recruiter', 'talent_admin', 'super_admin');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Ensure RLS is enabled on all relevant tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_challenges ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions to the 'anon' and 'authenticated' roles
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.profiles TO anon, authenticated;
GRANT ALL ON public.candidates TO anon, authenticated;
GRANT ALL ON public.companies TO anon, authenticated;
GRANT ALL ON public.jobs TO anon, authenticated;
GRANT ALL ON public.applications TO anon, authenticated;
GRANT ALL ON public.interviews TO anon, authenticated;
GRANT ALL ON public.audit_logs TO anon, authenticated;
GRANT ALL ON public.interview_challenges TO anon, authenticated;

-- Drop all existing RLS policies on the profiles table to ensure a clean slate
DROP POLICY IF EXISTS "Profiles: Enable insert for authenticated users only" ON profiles;
DROP POLICY IF EXISTS "Profiles: Enable read access for all authenticated users" ON profiles;
DROP POLICY IF EXISTS "Profiles: Enable update for users based on id" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON profiles;
DROP POLICY IF EXISTS "Enable select for users based on user_id" ON profiles;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON profiles;

-- Re-create RLS policies for the profiles table
-- Policy for INSERT: Only authenticated users can insert their own profile
CREATE POLICY "Profiles: Enable insert for authenticated users only" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Policy for SELECT: Allow all authenticated users to read all profiles.
CREATE POLICY "Profiles: Enable read access for all authenticated users" ON profiles
    FOR SELECT USING (auth.role() = 'authenticated');

-- Policy for UPDATE: Users can update their own profile
CREATE POLICY "Profiles: Enable update for users based on id" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- Policies for the candidates table
DROP POLICY IF EXISTS "Candidates can manage own data" ON candidates;
DROP POLICY IF EXISTS "Enable all for candidates" ON candidates;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON candidates;
DROP POLICY IF EXISTS "Enable read access for all users" ON candidates;
DROP POLICY IF EXISTS "Enable update for users based on profile_id" ON candidates;

CREATE POLICY "Candidates: Enable insert for authenticated users only" ON candidates
  FOR INSERT WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Candidates: Enable read access for all authenticated users" ON candidates
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Candidates: Enable update for users based on profile_id" ON candidates
  FOR UPDATE USING (auth.uid() = profile_id);

-- Policies for the applications table
DROP POLICY IF EXISTS "Users can view relevant applications" ON applications;
DROP POLICY IF EXISTS "Enable all for applications" ON applications;
DROP POLICY IF EXISTS "Applications: Enable read access for relevant users" ON applications;
DROP POLICY IF EXISTS "Applications: Enable insert for candidates" ON applications;
DROP POLICY IF EXISTS "Applications: Enable update for recruiters/admins" ON applications;

CREATE POLICY "Applications: Enable read access for relevant users" ON applications
    FOR SELECT USING (
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

CREATE POLICY "Applications: Enable insert for candidates" ON applications
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM candidates WHERE id = candidate_id AND profile_id = auth.uid())
    );

CREATE POLICY "Applications: Enable update for recruiters/admins" ON applications
    FOR UPDATE USING (
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

-- Policies for the jobs table
DROP POLICY IF EXISTS "Enable insert for recruiters only" ON jobs;
DROP POLICY IF EXISTS "Enable read access for all users" ON jobs;
DROP POLICY IF EXISTS "Enable update for recruiters only" ON jobs;
DROP POLICY IF EXISTS "Jobs: Enable insert for recruiters only" ON jobs;
DROP POLICY IF EXISTS "Jobs: Enable read access for all authenticated users" ON jobs;
DROP POLICY IF EXISTS "Jobs: Enable update for recruiters only" ON jobs;

CREATE POLICY "Jobs: Enable insert for recruiters only" ON jobs
  FOR INSERT WITH CHECK (
      EXISTS (
          SELECT 1 FROM profiles 
          WHERE profiles.id = auth.uid() 
          AND profiles.role = 'recruiter'
      )
  );

CREATE POLICY "Jobs: Enable read access for all authenticated users" ON jobs
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Jobs: Enable update for recruiters only" ON jobs
  FOR UPDATE USING (auth.uid() = recruiter_id);

-- Policies for interviews table
DROP POLICY IF EXISTS "Enable all for interviews" ON interviews;
DROP POLICY IF EXISTS "Interviews: Enable read access for relevant users" ON interviews;
DROP POLICY IF EXISTS "Interviews: Enable insert for recruiters" ON interviews;
DROP POLICY IF EXISTS "Interviews: Enable update for recruiters/admins" ON interviews;

CREATE POLICY "Interviews: Enable read access for relevant users" ON interviews
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM applications a JOIN candidates c ON a.candidate_id = c.id
            WHERE a.id = application_id AND c.profile_id = auth.uid()
        ) OR
        interviewer_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('talent_admin', 'super_admin')
        )
    );

CREATE POLICY "Interviews: Enable insert for recruiters" ON interviews
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role = 'recruiter'
        )
    );

CREATE POLICY "Interviews: Enable update for recruiters/admins" ON interviews
    FOR UPDATE USING (
        interviewer_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('talent_admin', 'super_admin')
        )
    );

-- Policies for companies table (assuming read-only for most users)
DROP POLICY IF EXISTS "Enable read access for all users" ON companies;
DROP POLICY IF EXISTS "Companies: Enable read access for all authenticated users" ON companies;
CREATE POLICY "Companies: Enable read access for all authenticated users" ON companies
    FOR SELECT USING (auth.role() = 'authenticated');

-- Policies for audit_logs table (read-only for admins, insert for all)
DROP POLICY IF EXISTS "Enable all for audit_logs" ON audit_logs;
DROP POLICY IF EXISTS "Audit Logs: Enable insert for all authenticated users" ON audit_logs;
DROP POLICY IF EXISTS "Audit Logs: Enable read access for admins" ON audit_logs;

CREATE POLICY "Audit Logs: Enable insert for all authenticated users" ON audit_logs
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Audit Logs: Enable read access for admins" ON audit_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('talent_admin', 'super_admin')
        )
    );

-- Policies for interview_challenges table
DROP POLICY IF EXISTS "Enable all for interview_challenges" ON interview_challenges;
DROP POLICY IF EXISTS "Interview Challenges: Enable read access for relevant users" ON interview_challenges;
DROP POLICY IF EXISTS "Interview Challenges: Enable insert for interviewers" ON interview_challenges;
DROP POLICY IF EXISTS "Interview Challenges: Enable update for interviewers" ON interview_challenges;

CREATE POLICY "Interview Challenges: Enable read access for relevant users" ON interview_challenges
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM interviews i JOIN applications a ON i.application_id = a.id JOIN candidates c ON a.candidate_id = c.id
            WHERE i.id = interview_id AND c.profile_id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM interviews i 
            WHERE i.id = interview_id AND i.interviewer_id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('talent_admin', 'super_admin')
        )
    );

CREATE POLICY "Interview Challenges: Enable insert for interviewers" ON interview_challenges
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM interviews i 
            WHERE i.id = interview_id AND i.interviewer_id = auth.uid()
        )
    );

CREATE POLICY "Interview Challenges: Enable update for interviewers" ON interview_challenges
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM interviews i 
            WHERE i.id = interview_id AND i.interviewer_id = auth.uid()
        )
    );
