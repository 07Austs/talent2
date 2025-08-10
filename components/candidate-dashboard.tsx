"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { User, Briefcase, Calendar, TrendingUp, Star, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react"

interface CandidateStats {
  profileCompletion: number
  totalApplications: number
  interviewsScheduled: number
  aiScore: number
  skillsValidated: number
  totalSkills: number
}

interface JobMatch {
  id: string
  title: string
  company: string
  location: string
  matchScore: number
  salary: string
  postedDate: string
}

interface Application {
  id: string
  jobTitle: string
  company: string
  status: "applied" | "shortlisted" | "interview" | "offer" | "hired" | "rejected"
  appliedDate: string
  lastUpdate: string
}

export function CandidateDashboard() {
  const { profile } = useAuth()
  const [stats, setStats] = useState<CandidateStats>({
    profileCompletion: 0,
    totalApplications: 0,
    interviewsScheduled: 0,
    aiScore: 0,
    skillsValidated: 0,
    totalSkills: 0,
  })
  const [jobMatches, setJobMatches] = useState<JobMatch[]>([])
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (profile) {
      fetchDashboardData()
    }
  }, [profile])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)

      // Fetch candidate data
      const { data: candidate } = await supabase.from("candidates").select("*").eq("profile_id", profile?.id).single()

      if (candidate) {
        // Calculate profile completion
        const completionFields = [
          candidate.skills?.length > 0,
          candidate.experience_years,
          candidate.location,
          candidate.resume_url,
          candidate.github_url,
        ]
        const completion = (completionFields.filter(Boolean).length / completionFields.length) * 100

        // Fetch applications
        const { data: applicationsData } = await supabase
          .from("applications")
          .select(`
            id,
            status,
            created_at,
            updated_at,
            jobs (
              title,
              companies (name)
            )
          `)
          .eq("candidate_id", candidate.id)
          .order("created_at", { ascending: false })

        // Fetch interviews
        const { data: interviews } = await supabase
          .from("interviews")
          .select("id, status, scheduled_at")
          .in("application_id", applicationsData?.map((app) => app.id) || [])
          .eq("status", "scheduled")

        // Mock job matches (in production, this would use AI matching)
        const mockJobMatches: JobMatch[] = [
          {
            id: "1",
            title: "Senior ML Engineer",
            company: "TechCorp",
            location: "San Francisco, CA",
            matchScore: 0.95,
            salary: "$150k - $200k",
            postedDate: "2024-01-15",
          },
          {
            id: "2",
            title: "AI Research Scientist",
            company: "InnovateLab",
            location: "Remote",
            matchScore: 0.88,
            salary: "$180k - $250k",
            postedDate: "2024-01-14",
          },
          {
            id: "3",
            title: "MLOps Engineer",
            company: "DataFlow",
            location: "New York, NY",
            matchScore: 0.82,
            salary: "$130k - $170k",
            postedDate: "2024-01-13",
          },
        ]

        setStats({
          profileCompletion: completion,
          totalApplications: applicationsData?.length || 0,
          interviewsScheduled: interviews?.length || 0,
          aiScore: candidate.ai_score || 0,
          skillsValidated: candidate.skills?.filter((s: any) => s.validated).length || 0,
          totalSkills: candidate.skills?.length || 0,
        })

        setJobMatches(mockJobMatches)

        setApplications(
          applicationsData?.map((app) => ({
            id: app.id,
            jobTitle: app.jobs?.title || "Unknown",
            company: app.jobs?.companies?.name || "Unknown",
            status: app.status,
            appliedDate: app.created_at,
            lastUpdate: app.updated_at,
          })) || [],
        )
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "applied":
        return <Clock className="h-4 w-4 text-blue-500" />
      case "shortlisted":
        return <Star className="h-4 w-4 text-yellow-500" />
      case "interview":
        return <Calendar className="h-4 w-4 text-purple-500" />
      case "offer":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "hired":
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case "rejected":
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "applied":
        return "bg-blue-100 text-blue-800"
      case "shortlisted":
        return "bg-yellow-100 text-yellow-800"
      case "interview":
        return "bg-purple-100 text-purple-800"
      case "offer":
        return "bg-green-100 text-green-800"
      case "hired":
        return "bg-green-200 text-green-900"
      case "rejected":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
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
          <h1 className="text-3xl font-bold tracking-tight">Welcome back, {profile?.full_name?.split(" ")[0]}!</h1>
          <p className="text-muted-foreground">Here's your AI-powered career dashboard</p>
        </div>
        <Button>
          <User className="mr-2 h-4 w-4" />
          Complete Profile
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Profile Completion</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.profileCompletion.toFixed(0)}%</div>
            <Progress value={stats.profileCompletion} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AI Score</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(stats.aiScore * 100).toFixed(0)}</div>
            <p className="text-xs text-muted-foreground">+12% from last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Applications</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalApplications}</div>
            <p className="text-xs text-muted-foreground">{stats.interviewsScheduled} interviews scheduled</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Skills Validated</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.skillsValidated}/{stats.totalSkills}
            </div>
            <p className="text-xs text-muted-foreground">Complete skill validation</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="matches" className="space-y-4">
        <TabsList>
          <TabsTrigger value="matches">AI Job Matches</TabsTrigger>
          <TabsTrigger value="applications">My Applications</TabsTrigger>
          <TabsTrigger value="interviews">Upcoming Interviews</TabsTrigger>
        </TabsList>

        <TabsContent value="matches" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top AI Job Matches</CardTitle>
              <CardDescription>Jobs ranked by AI compatibility with your profile</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {jobMatches.map((job) => (
                  <div key={job.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <h3 className="font-semibold">{job.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {job.company} • {job.location}
                      </p>
                      <p className="text-sm font-medium text-green-600">{job.salary}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-primary">{(job.matchScore * 100).toFixed(0)}%</div>
                        <div className="text-xs text-muted-foreground">Match</div>
                      </div>
                      <Button>Apply Now</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="applications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Application Status</CardTitle>
              <CardDescription>Track your job applications and their progress</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Job Title</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Applied</TableHead>
                    <TableHead>Last Update</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {applications.map((app) => (
                    <TableRow key={app.id}>
                      <TableCell className="font-medium">{app.jobTitle}</TableCell>
                      <TableCell>{app.company}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(app.status)}
                          <Badge variant="secondary" className={getStatusColor(app.status)}>
                            {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>{new Date(app.appliedDate).toLocaleDateString()}</TableCell>
                      <TableCell>{new Date(app.lastUpdate).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="interviews" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Interviews</CardTitle>
              <CardDescription>Prepare for your AI-powered interview sessions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No interviews scheduled</h3>
                <p className="text-muted-foreground mb-4">Apply to more jobs to get interview opportunities</p>
                <Button>Browse Jobs</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
