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
  candidateProfile: Candidate | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, fullName: string, role: Profile["role"]) => Promise<void>
  signOut: () => Promise<void>
  updateProfile: (updates: Partial<Profile>) => Promise<void>
  updateCandidateProfile: (updates: Partial<Candidate>) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [candidateProfile, setCandidateProfile] = useState<Candidate | null>(null)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    // Get initial session
    const initializeAuth = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession()

        if (error) {
          console.error("Error getting session:", error)
          setLoading(false)
          return
        }

        if (session?.user) {
          setUser(session.user)
          await fetchUserData(session.user.id)
        } else {
          setLoading(false)
        }
      } catch (error) {
        console.error("Error initializing auth:", error)
        setLoading(false)
      }
    }

    initializeAuth()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state changed:", event, session?.user?.id)

      setUser(session?.user ?? null)

      if (session?.user) {
        await fetchUserData(session.user.id)
      } else {
        setProfile(null)
        setCandidateProfile(null)
        setLoading(false)
      }

      // Handle auth events
      if (event === "SIGNED_IN") {
        toast({
          title: "Welcome back!",
          description: "You've been successfully signed in.",
        })
      } else if (event === "SIGNED_OUT") {
        toast({
          title: "Signed out",
          description: "You've been successfully signed out.",
        })
      }
    })

    return () => subscription.unsubscribe()
  }, [toast])

  const fetchUserData = async (userId: string) => {
    try {
      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single()

      if (profileError) {
        console.error("Error fetching profile:", profileError)
        // If profile doesn't exist, that's okay - it might be a new user
        if (profileError.code !== "PGRST116") {
          // PGRST116 is "not found"
          throw profileError
        }
      } else {
        setProfile(profileData)

        // If user is a candidate, fetch candidate profile
        if (profileData.role === "candidate") {
          const { data: candidateData, error: candidateError } = await supabase
            .from("candidates")
            .select("*")
            .eq("profile_id", userId)
            .single()

          if (candidateError) {
            console.error("Error fetching candidate profile:", candidateError)
            // If candidate profile doesn't exist, that's okay
            if (candidateError.code !== "PGRST116") {
              throw candidateError
            }
          } else {
            setCandidateProfile(candidateData)
          }
        }
      }
    } catch (error) {
      console.error("Error fetching user data:", error)
      toast({
        title: "Error",
        description: "Failed to load profile data. Please try refreshing the page.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true)
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (error) throw error

      // The onAuthStateChange will handle fetching user data
    } catch (error: any) {
      console.error("Sign in error:", error)
      toast({
        title: "Sign in failed",
        description: error.message || "Invalid email or password",
        variant: "destructive",
      })
      setLoading(false)
      throw error
    }
  }

  const signUp = async (email: string, password: string, fullName: string, role: Profile["role"]) => {
    try {
      setLoading(true)

      // First, sign up the user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            role: role,
          },
        },
      })

      if (authError) throw authError

      if (!authData.user) {
        throw new Error("User creation failed")
      }

      // Wait a moment for the user to be fully created
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Create profile record
      const { error: profileError } = await supabase.from("profiles").insert({
        id: authData.user.id,
        email: authData.user.email!,
        full_name: fullName.trim(),
        role: role,
      })

      if (profileError) {
        console.error("Profile creation error:", profileError)
        // Don't throw here - the profile might already exist from a trigger
      }

      // If the user is a candidate, create candidate record
      if (role === "candidate") {
        const { error: candidateError } = await supabase.from("candidates").insert({
          profile_id: authData.user.id,
          skills: [],
          ai_score: 0.0,
        })

        if (candidateError) {
          console.error("Candidate creation error:", candidateError)
          // Don't throw here - the candidate profile might already exist
        }
      }

      // Fetch the user data
      await fetchUserData(authData.user.id)

      toast({
        title: "Account created!",
        description: "Welcome to TalentAI! You can now start using the platform.",
      })
    } catch (error: any) {
      console.error("Sign up error:", error)
      toast({
        title: "Sign up failed",
        description: error.message || "Failed to create account. Please try again.",
        variant: "destructive",
      })
      setLoading(false)
      throw error
    }
  }

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
    } catch (error: any) {
      console.error("Sign out error:", error)
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

      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated.",
      })
    } catch (error: any) {
      console.error("Profile update error:", error)
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      })
      throw error
    }
  }

  const updateCandidateProfile = async (updates: Partial<Candidate>) => {
    if (!user || profile?.role !== "candidate") return

    try {
      const { error } = await supabase.from("candidates").update(updates).eq("profile_id", user.id)

      if (error) throw error

      setCandidateProfile((prev) => (prev ? { ...prev, ...updates } : null))

      toast({
        title: "Profile updated",
        description: "Your candidate profile has been successfully updated.",
      })
    } catch (error: any) {
      console.error("Candidate profile update error:", error)
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      })
      throw error
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
