"use client"

import type React from "react"

import { useAuth } from "@/lib/auth-context"
import { DashboardLayout } from "@/components/dashboard-layout"
import { CandidateDashboard } from "@/components/candidate-dashboard"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Brain, Users, Zap, Shield, TrendingUp, Star, AlertCircle, Loader2 } from "lucide-react"
import { useState } from "react"

function LandingPage() {
  const { signIn, signUp, loading } = useAuth()
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [fullName, setFullName] = useState("")
  const [role, setRole] = useState<"candidate" | "recruiter">("candidate")
  const [formLoading, setFormLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormLoading(true)
    setError(null)

    // Basic validation
    if (isSignUp && !fullName.trim()) {
      setError("Full name is required")
      setFormLoading(false)
      return
    }

    if (!email.trim() || !password.trim()) {
      setError("Email and password are required")
      setFormLoading(false)
      return
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters")
      setFormLoading(false)
      return
    }

    try {
      if (isSignUp) {
        await signUp(email.trim(), password, fullName.trim(), role)
      } else {
        await signIn(email.trim(), password)
      }
    } catch (error: any) {
      console.error("Auth error:", error)
      setError(error.message || "Authentication failed. Please try again.")
    } finally {
      setFormLoading(false)
    }
  }

  const resetForm = () => {
    setEmail("")
    setPassword("")
    setFullName("")
    setRole("candidate")
    setError(null)
  }

  const toggleMode = () => {
    setIsSignUp(!isSignUp)
    resetForm()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Brain className="h-4 w-4" />
            </div>
            <span className="text-xl font-bold">TalentAI</span>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-sm hover:text-primary">
              Features
            </a>
            <a href="#how-it-works" className="text-sm hover:text-primary">
              How it Works
            </a>
            <a href="#pricing" className="text-sm hover:text-primary">
              Pricing
            </a>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="space-y-4">
            <h1 className="text-5xl font-bold tracking-tight">
              AI-Powered Hiring for the <span className="text-primary">AI Generation</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Revolutionary talent marketplace that matches AI engineers with dream jobs using advanced AI matching,
              anti-cheating interviews, and real-time skill validation.
            </p>
          </div>

          <div className="flex items-center justify-center gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              <span>100K+ AI Engineers</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <span>95% Match Accuracy</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Shield className="h-4 w-4 text-blue-500" />
              <span>Anti-Cheat Technology</span>
            </div>
          </div>

          {/* Auth Form */}
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle>{isSignUp ? "Join TalentAI" : "Welcome Back"}</CardTitle>
              <CardDescription>
                {isSignUp ? "Create your account to get started" : "Sign in to your account"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {error && (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {isSignUp && (
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Enter your full name"
                      required
                      disabled={formLoading}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                    disabled={formLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    minLength={6}
                    disabled={formLoading}
                  />
                  {isSignUp && <p className="text-xs text-muted-foreground">Password must be at least 6 characters</p>}
                </div>

                {isSignUp && (
                  <div className="space-y-2">
                    <Label>I am a:</Label>
                    <Tabs value={role} onValueChange={(value) => setRole(value as "candidate" | "recruiter")}>
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="candidate" disabled={formLoading}>
                          Job Seeker
                        </TabsTrigger>
                        <TabsTrigger value="recruiter" disabled={formLoading}>
                          Recruiter
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>
                )}

                <Button type="submit" className="w-full" disabled={formLoading || loading}>
                  {formLoading || loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {isSignUp ? "Creating Account..." : "Signing In..."}
                    </>
                  ) : isSignUp ? (
                    "Create Account"
                  ) : (
                    "Sign In"
                  )}
                </Button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={toggleMode}
                    className="text-sm text-primary hover:underline"
                    disabled={formLoading}
                  >
                    {isSignUp ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
                  </button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-4">Revolutionary Features</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Built from the ground up to solve the broken hiring process with AI-first approach
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <Card>
            <CardHeader>
              <Brain className="h-8 w-8 text-primary mb-2" />
              <CardTitle>AI-Powered Matching</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Advanced RAG pipeline using Hugging Face embeddings for semantic job matching. No more keyword filtering
                - we understand context and skill depth.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Shield className="h-8 w-8 text-primary mb-2" />
              <CardTitle>Anti-Cheat Interviews</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Dynamic problem generation, real-time monitoring, and multi-modal verification to ensure authentic skill
                assessment.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Zap className="h-8 w-8 text-primary mb-2" />
              <CardTitle>Real-Time Validation</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Instant skill verification through AI-generated challenges that adapt to candidate responses in
                real-time.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-white">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              <span className="font-semibold">TalentAI</span>
            </div>
            <p className="text-sm text-muted-foreground">© 2024 TalentAI. Revolutionizing AI talent acquisition.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default function HomePage() {
  const { user, profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  if (!user || !profile) {
    return <LandingPage />
  }

  // Route to appropriate dashboard based on role
  if (profile.role === "candidate") {
    return (
      <DashboardLayout>
        <CandidateDashboard />
      </DashboardLayout>
    )
  }

  // For other roles, show a placeholder dashboard
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {profile.role === "recruiter"
              ? "Recruiter Dashboard"
              : profile.role === "talent_admin"
                ? "Admin Dashboard"
                : "Super Admin Dashboard"}
          </h1>
          <p className="text-muted-foreground">Welcome to your {profile.role.replace("_", " ")} dashboard</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Coming Soon</CardTitle>
            <CardDescription>This dashboard is under development. Check back soon!</CardDescription>
          </CardHeader>
          <CardContent>
            <Button>
              <Users className="mr-2 h-4 w-4" />
              Explore Features
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
