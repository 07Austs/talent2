import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          role: "candidate" | "recruiter" | "talent_admin" | "super_admin"
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          role?: "candidate" | "recruiter" | "talent_admin" | "super_admin"
          avatar_url?: string | null
        }
        Update: {
          full_name?: string | null
          role?: "candidate" | "recruiter" | "talent_admin" | "super_admin"
          avatar_url?: string | null
        }
      }
      candidates: {
        Row: {
          id: string
          profile_id: string
          skills: any[] // JSONB array of skill objects
          experience_years: number | null
          location: string | null
          resume_url: string | null
          github_url: string | null
          linkedin_url: string | null
          ai_score: number
          embedding: number[] | null // Vector embedding
          created_at: string
          updated_at: string
        }
        Insert: {
          profile_id: string
          skills?: any[]
          experience_years?: number | null
          location?: string | null
          resume_url?: string | null
          github_url?: string | null
          linkedin_url?: string | null
          ai_score?: number
          embedding?: number[] | null
        }
        Update: {
          skills?: any[]
          experience_years?: number | null
          location?: string | null
          resume_url?: string | null
          github_url?: string | null
          linkedin_url?: string | null
          ai_score?: number
          embedding?: number[] | null
        }
      }
      companies: {
        Row: {
          id: string
          name: string
          description: string | null
          website: string | null
          logo_url: string | null
          created_at: string
        }
      }
      jobs: {
        Row: {
          id: string
          company_id: string
          recruiter_id: string
          title: string
          description: string | null
          requirements: any[] // JSONB array of requirements
          location: string | null
          salary_min: number | null
          salary_max: number | null
          is_active: boolean
          embedding: number[] | null // Vector embedding
          created_at: string
          updated_at: string
        }
        Insert: {
          company_id: string
          recruiter_id: string
          title: string
          description?: string | null
          requirements?: any[]
          location?: string | null
          salary_min?: number | null
          salary_max?: number | null
          is_active?: boolean
          embedding?: number[] | null
        }
        Update: {
          company_id?: string
          recruiter_id?: string
          title?: string
          description?: string | null
          requirements?: any[]
          location?: string | null
          salary_min?: number | null
          salary_max?: number | null
          is_active?: boolean
          embedding?: number[] | null
        }
      }
      applications: {
        Row: {
          id: string
          candidate_id: string
          job_id: string
          status: "applied" | "shortlisted" | "interview" | "offer" | "hired" | "rejected"
          ai_match_score: number | null
          recruiter_notes: string | null
          created_at: string
          updated_at: string
        }
      }
      interviews: {
        Row: {
          id: string
          application_id: string
          interviewer_id: string
          scheduled_at: string | null
          status: "scheduled" | "in_progress" | "completed" | "cancelled"
          session_data: any
          integrity_score: number | null
          technical_score: number | null
          soft_skills_score: number | null
          feedback: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          application_id: string
          interviewer_id: string
          scheduled_at: string | null
          status?: "scheduled" | "in_progress" | "completed" | "cancelled"
          session_data?: any
          integrity_score?: number | null
          technical_score?: number | null
          soft_skills_score?: number | null
          feedback?: string | null
        }
        Update: {
          scheduled_at?: string | null
          status?: "scheduled" | "in_progress" | "completed" | "cancelled"
          session_data?: any
          integrity_score?: number | null
          technical_score?: number | null
          soft_skills_score?: number | null
          feedback?: string | null
        }
      }
    }
  }
}
