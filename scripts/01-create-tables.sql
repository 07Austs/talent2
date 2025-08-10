-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- User roles enum
CREATE TYPE user_role AS ENUM ('candidate', 'recruiter', 'talent_admin', 'super_admin');

-- Interview status enum
CREATE TYPE interview_status AS ENUM ('scheduled', 'in_progress', 'completed', 'cancelled');

-- Application status enum
CREATE TYPE application_status AS ENUM ('applied', 'shortlisted', 'interview', 'offer', 'hired', 'rejected');

-- Users table (extends Supabase auth.users)
CREATE TABLE profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    role user_role NOT NULL DEFAULT 'candidate',
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Candidates table
CREATE TABLE candidates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    skills JSONB DEFAULT '[]',
    experience_years INTEGER,
    location TEXT,
    resume_url TEXT,
    github_url TEXT,
    linkedin_url TEXT,
    ai_score DECIMAL(3,2) DEFAULT 0.0,
    embedding VECTOR(1536), -- OpenAI embedding dimension
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Companies table
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    website TEXT,
    logo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Jobs table
CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    recruiter_id UUID REFERENCES profiles(id),
    title TEXT NOT NULL,
    description TEXT,
    requirements JSONB DEFAULT '[]',
    location TEXT,
    salary_min INTEGER,
    salary_max INTEGER,
    is_active BOOLEAN DEFAULT true,
    embedding VECTOR(1536),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Applications table
CREATE TABLE applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE,
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    status application_status DEFAULT 'applied',
    ai_match_score DECIMAL(3,2),
    recruiter_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(candidate_id, job_id)
);

-- Interviews table
CREATE TABLE interviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
    interviewer_id UUID REFERENCES profiles(id),
    scheduled_at TIMESTAMP WITH TIME ZONE,
    status interview_status DEFAULT 'scheduled',
    session_data JSONB DEFAULT '{}',
    integrity_score DECIMAL(3,2),
    technical_score DECIMAL(3,2),
    soft_skills_score DECIMAL(3,2),
    feedback TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audit logs table
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id),
    action TEXT NOT NULL,
    resource_type TEXT,
    resource_id UUID,
    metadata JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Interview challenges table
CREATE TABLE interview_challenges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    interview_id UUID REFERENCES interviews(id) ON DELETE CASCADE,
    challenge_type TEXT NOT NULL,
    problem_statement TEXT NOT NULL,
    solution TEXT,
    candidate_response TEXT,
    time_taken INTEGER, -- in seconds
    integrity_flags JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_candidates_embedding ON candidates USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX idx_jobs_embedding ON jobs USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX idx_applications_status ON applications(status);
CREATE INDEX idx_interviews_status ON interviews(status);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- Row Level Security policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE interviews ENABLE ROW LEVEL SECURITY;

-- Profiles policy
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- Candidates policy
CREATE POLICY "Candidates can manage own data" ON candidates
    FOR ALL USING (
        profile_id = auth.uid() OR 
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('recruiter', 'talent_admin', 'super_admin')
        )
    );

-- Applications policy
CREATE POLICY "Users can view relevant applications" ON applications
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
