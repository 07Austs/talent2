"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import type { User } from "@supabase/supabase-js"
import { supabase, type Database } from "./supabase"
import { useToast } from "@/hooks/use-toast"

type Profile = Database["public"]["Tables"]["profiles"]["Row"]
type Candidate = Database["public"]["Tables"]["candidates"]["Row"]

interface AuthContextType {
  user: User | null
  profile: Profile | null
  candidateProfile: Candidate | null // Add candidate-specific profile
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, fullName: string, role: Profile["role"]) => Promise<void>
  signOut: () => Promise<void>
  updateProfile: (updates: Partial<Profile>) => Promise<void>
  updateCandidateProfile: (updates: Partial<Candidate>) => Promise<void> // New function
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [candidateProfile, setCandidateProfile] = useState<Candidate | null>(null) // New state
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id)
        if (session.user.user_metadata.role === "candidate") {
          fetchCandidateProfile(session.user.id)
        }
      } else {
        setLoading(false)
      }
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null)

      if (session?.user) {
        await fetchProfile(session.user.id)
        if (session.user.user_metadata.role === "candidate") {
          await fetchCandidateProfile(session.user.id)
        }
      } else {
        setProfile(null)
        setCandidateProfile(null) // Clear candidate profile on sign out
        setLoading(false)
      }

      // Log auth events
      if (event === "SIGNED_IN") {
        await logAuditEvent("user_signed_in", "auth", session?.user?.id)
        toast({
          title: "Welcome back!",
          description: "You've been successfully signed in.",
        })
      } else if (event === "SIGNED_OUT") {
        toast({
          title: "Signed out",
          description: "You've been successfully signed out.",
        })
      } else if (event === "SIGNED_UP") {
        toast({
          title: "Account created!",
          description: "Welcome to TalentAI! Please check your email to verify your account.",
        })
      }
    })

    return () => subscription.unsubscribe()
  }, [toast])

  const fetchProfile = async (userId: string, retries = 3) => {
    try {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single()

      if (error) {
        if (retries > 0) {
          // Profile might not be created yet, retry
          setTimeout(() => fetchProfile(userId, retries - 1), 1000)
          return
        }
        throw error
      }

      setProfile(data)
    } catch (error) {
      console.error("Error fetching profile:", error)
      if (retries === 0) {
        toast({
          title: "Error",
          description: "Failed to load profile data. Please refresh the page.",
          variant: "destructive",
        })
      }
    } finally {
      if (retries === 0) {
        setLoading(false)
      }
    }
  }

  const fetchCandidateProfile = async (profileId: string, retries = 3) => {
    try {
      const { data, error } = await supabase.from("candidates").select("*").eq("profile_id", profileId).single()

      if (error) {
        if (retries > 0) {
          setTimeout(() => fetchCandidateProfile(profileId, retries - 1), 1000)
          return
        }
        throw error
      }
      setCandidateProfile(data)
    } catch (error) {
      console.error("Error fetching candidate profile:", error)
      if (retries === 0) {
        toast({
          title: "Error",
          description: "Failed to load candidate profile data.",
          variant: "destructive",
        })
      }
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) throw error
    } catch (error: any) {
      toast({
        title: "Sign in failed",
        description: error.message,
        variant: "destructive",
      })
      throw error
    }
  }

  const signUp = async (email: string, password: string, fullName: string, role: Profile["role"]) => {
    try {
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: role,
          },
        },
      })

      if (authError) throw authError

      if (data.user) {
        // Manually create profile entry
        const { error: profileError } = await supabase.from("profiles").insert({
          id: data.user.id,
          email: data.user.email!,
          full_name: fullName,
          role: role,
        })

        if (profileError) throw profileError

        // If the user is a candidate, also create a candidate record
        if (role === "candidate") {
          const { error: candidateError } = await supabase.from("candidates").insert({
            profile_id: data.user.id,
            skills: [], // Initialize with empty array
            ai_score: 0.0,
          })
          if (candidateError) throw candidateError
        }

        // Fetch the newly created profile and candidate profile
        await fetchProfile(data.user.id)
        if (role === "candidate") {
          await fetchCandidateProfile(data.user.id)
        }
      }
    } catch (error: any) {
      console.error("Sign up error:", error)
      toast({
        title: "Sign up failed",
        description: error.message,
        variant: "destructive",
      })
      throw error
    }
  }

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
    } catch (error: any) {
      toast({
        title: "Sign out failed",
        description: error.message,
        variant: "destructive",
      })
      throw error
    }
  }

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return

    try {
      const { error } = await supabase.from("profiles").update(updates).eq("id", user.id)

      if (error) throw error

      setProfile((prev) => (prev ? { ...prev, ...updates } : null))
      await logAuditEvent("profile_updated", "profile", user.id)

      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated.",
      })
    } catch (error: any) {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      })
      throw error
    }
  }

  const updateCandidateProfile = async (updates: Partial<Candidate>) => {
    if (!user || profile?.role !== "candidate" || !candidateProfile) return

    try {
      const { error } = await supabase.from("candidates").update(updates).eq("profile_id", user.id)

      if (error) throw error

      setCandidateProfile((prev) => (prev ? { ...prev, ...updates } : null))
      await logAuditEvent("candidate_profile_updated", "candidate_profile", user.id)

      toast({
        title: "Candidate profile updated",
        description: "Your candidate profile has been successfully updated.",
      })
    } catch (error: any) {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      })
      throw error
    }
  }

  const logAuditEvent = async (action: string, resourceType: string, resourceId?: string) => {
    try {
      await supabase.from("audit_logs").insert({
        user_id: user?.id,
        action,
        resource_type: resourceType,
        resource_id: resourceId,
        metadata: {},
      })
    } catch (error) {
      console.error("Failed to log audit event:", error)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        candidateProfile,
        loading,
        signIn,
        signUp,
        signOut,
        updateProfile,
        updateCandidateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
