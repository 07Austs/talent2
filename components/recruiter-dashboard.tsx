"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Briefcase, Users, BarChart3 } from "lucide-react"
import { JobPostForm } from "./job-post-form"
import { CandidatePoolList } from "./candidate-pool-list"
import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"

interface RecruiterStats {
  activeJobs: number
  totalCandidates: number
  shortlistedCandidates: number
  interviewsScheduled: number
}

export function RecruiterDashboard() {
  const { profile } = useAuth()
  const [stats, setStats] = useState<RecruiterStats>({
    activeJobs: 0,
    totalCandidates: 0,
    shortlistedCandidates: 0,
    interviewsScheduled: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (profile?.id) {
      fetchRecruiterStats(profile.id)
    }
  }, [profile])

  const fetchRecruiterStats = async (recruiterId: string) => {
    setLoading(true)
    try {
      // Active Jobs
      const { count: activeJobsCount, error: jobsError } = await supabase
        .from("jobs")
        .select("*", { count: "exact" })
        .eq("recruiter_id", recruiterId)
        .eq("is_active", true)
      if (jobsError) throw jobsError

      // Total Candidates (all candidates in the system for now, could be filtered by jobs later)
      const { count: totalCandidatesCount, error: candidatesError } = await supabase
        .from("candidates")
        .select("*", { count: "exact" })
      if (candidatesError) throw candidatesError

      // Shortlisted Candidates (applications with status 'shortlisted' for recruiter's jobs)
      const { data: recruiterJobs, error: recruiterJobsError } = await supabase
        .from("jobs")
        .select("id")
        .eq("recruiter_id", recruiterId)
      if (recruiterJobsError) throw recruiterJobsError
      const jobIds = recruiterJobs?.map((job) => job.id) || []

      const { count: shortlistedCount, error: shortlistedError } = await supabase
        .from("applications")
        .select("*", { count: "exact" })
        .in("job_id", jobIds)
        .eq("status", "shortlisted")
      if (shortlistedError) throw shortlistedError

      // Interviews Scheduled
      const { count: interviewsCount, error: interviewsError } = await supabase
        .from("interviews")
        .select("*", { count: "exact" })
        .eq("interviewer_id", recruiterId)
        .eq("status", "scheduled")
      if (interviewsError) throw interviewsError

      setStats({
        activeJobs: activeJobsCount || 0,
        totalCandidates: totalCandidatesCount || 0,
        shortlistedCandidates: shortlistedCount || 0,
        interviewsScheduled: interviewsCount || 0,
      })
    } catch (error) {
      console.error("Error fetching recruiter stats:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-4 bg-gray-200 rounded animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-16 bg-gray-200 rounded animate-pulse mb-2" />
                <div className="h-3 w-24 bg-gray-200 rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Recruiter Dashboard</h1>
          <p className="text-muted-foreground">Manage your job postings and candidate pipeline.</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Jobs</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeJobs}</div>
            <p className="text-xs text-muted-foreground">Currently open positions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Candidates</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCandidates}</div>
            <p className="text-xs text-muted-foreground">In your talent pool</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Shortlisted</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.shortlistedCandidates}</div>
            <p className="text-xs text-muted-foreground">Candidates for your jobs</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Interviews</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.interviewsScheduled}</div>
            <p className="text-xs text-muted-foreground">Scheduled for your roles</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="candidates" className="space-y-4">
        <TabsList>
          <TabsTrigger value="candidates">AI-Ranked Candidates</TabsTrigger>
          <TabsTrigger value="post-job">Post New Job</TabsTrigger>
        </TabsList>

        <TabsContent value="candidates" className="space-y-4">
          <CandidatePoolList />
        </TabsContent>

        <TabsContent value="post-job" className="space-y-4">
          <JobPostForm />
        </TabsContent>
      </Tabs>
    </div>
  )
}
