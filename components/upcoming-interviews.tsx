"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Calendar, Clock, User, Video, FileText, AlertCircle, CheckCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"

interface Interview {
  id: string
  scheduled_at: string
  status: "scheduled" | "in_progress" | "completed" | "cancelled"
  application: {
    job: {
      title: string
      company: {
        name: string
      }
    }
    candidate: {
      profile: {
        full_name: string
        email: string
      }
    }
  }
  interviewer: {
    full_name: string
    email: string
  }
  technical_score: number | null
  soft_skills_score: number | null
  integrity_score: number | null
  feedback: string | null
}

export function UpcomingInterviews() {
  const { profile, user } = useAuth()
  const { toast } = useToast()
  const [interviews, setInterviews] = useState<Interview[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (profile && user) {
      fetchInterviews()
    }
  }, [profile, user])

  const fetchInterviews = async () => {
    if (!profile || !user) return

    setLoading(true)
    try {
      let query = supabase
        .from("interviews")
        .select(`
          id,
          scheduled_at,
          status,
          technical_score,
          soft_skills_score,
          integrity_score,
          feedback,
          applications (
            jobs (
              title,
              companies (name)
            ),
            candidates (
              profiles (full_name, email)
            )
          ),
          interviewer:profiles!interviews_interviewer_id_fkey (
            full_name,
            email
          )
        `)
        .order("scheduled_at", { ascending: true })

      // Filter based on user role
      if (profile.role === "candidate") {
        // For candidates, get interviews where they are the candidate
        query = query.eq("applications.candidate_id", user.id)
      } else if (profile.role === "recruiter") {
        // For recruiters, get interviews they are conducting
        query = query.eq("interviewer_id", user.id)
      }

      const { data, error } = await query

      if (error) throw error

      // Transform the data to match our interface
      const transformedData: Interview[] = (data || []).map((interview: any) => ({
        id: interview.id,
        scheduled_at: interview.scheduled_at,
        status: interview.status,
        technical_score: interview.technical_score,
        soft_skills_score: interview.soft_skills_score,
        integrity_score: interview.integrity_score,
        feedback: interview.feedback,
        application: {
          job: {
            title: interview.applications?.jobs?.title || "Unknown Position",
            company: {
              name: interview.applications?.jobs?.companies?.name || "Unknown Company",
            },
          },
          candidate: {
            profile: {
              full_name: interview.applications?.candidates?.profiles?.full_name || "Unknown Candidate",
              email: interview.applications?.candidates?.profiles?.email || "",
            },
          },
        },
        interviewer: {
          full_name: interview.interviewer?.full_name || "Unknown Interviewer",
          email: interview.interviewer?.email || "",
        },
      }))

      setInterviews(transformedData)
    } catch (error: any) {
      console.error("Error fetching interviews:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to load interviews.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "scheduled":
        return <Calendar className="h-4 w-4 text-blue-500" />
      case "in_progress":
        return <Video className="h-4 w-4 text-green-500" />
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case "cancelled":
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "scheduled":
        return "bg-blue-100 text-blue-800"
      case "in_progress":
        return "bg-green-100 text-green-800"
      case "completed":
        return "bg-gray-100 text-gray-800"
      case "cancelled":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const handleStartInterview = (interviewId: string) => {
    toast({
      title: "Starting Interview",
      description: "Redirecting to interview session...",
    })
    // In a real app, this would navigate to the interview session
    window.open(`/interview/${interviewId}`, "_blank")
  }

  const handleJoinInterview = (interviewId: string) => {
    toast({
      title: "Joining Interview",
      description: "Connecting to interview session...",
    })
    // In a real app, this would navigate to the interview session
    window.open(`/interview/${interviewId}`, "_blank")
  }

  const isInterviewSoon = (scheduledAt: string) => {
    const interviewTime = new Date(scheduledAt)
    const now = new Date()
    const timeDiff = interviewTime.getTime() - now.getTime()
    return timeDiff > 0 && timeDiff <= 30 * 60 * 1000 // Within 30 minutes
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Interviews</CardTitle>
          <CardDescription>Loading your interview schedule...</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center items-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    )
  }

  const upcomingInterviews = interviews.filter(
    (interview) => interview.status === "scheduled" || interview.status === "in_progress",
  )
  const completedInterviews = interviews.filter((interview) => interview.status === "completed")

  return (
    <div className="space-y-6">
      {/* Upcoming Interviews */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Upcoming Interviews
          </CardTitle>
          <CardDescription>
            {profile?.role === "candidate" ? "Your scheduled interview sessions" : "Interviews you're conducting"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {upcomingInterviews.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No upcoming interviews</h3>
              <p className="text-muted-foreground">
                {profile?.role === "candidate"
                  ? "Apply to more jobs to get interview opportunities"
                  : "Schedule interviews with shortlisted candidates"}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {upcomingInterviews.map((interview) => (
                <div
                  key={interview.id}
                  className={`p-4 border rounded-lg ${
                    isInterviewSoon(interview.scheduled_at) ? "border-orange-200 bg-orange-50" : ""
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{interview.application.job.title}</h3>
                        <Badge variant="secondary" className={getStatusColor(interview.status)}>
                          <div className="flex items-center gap-1">
                            {getStatusIcon(interview.status)}
                            {interview.status.charAt(0).toUpperCase() + interview.status.slice(1)}
                          </div>
                        </Badge>
                        {isInterviewSoon(interview.scheduled_at) && <Badge variant="destructive">Starting Soon</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground">{interview.application.job.company.name}</p>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {format(new Date(interview.scheduled_at), "PPP 'at' p")}
                        </div>
                        <div className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                          {profile?.role === "candidate"
                            ? `Interviewer: ${interview.interviewer.full_name}`
                            : `Candidate: ${interview.application.candidate.profile.full_name}`}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {interview.status === "scheduled" && (
                        <Button
                          onClick={() =>
                            profile?.role === "candidate"
                              ? handleJoinInterview(interview.id)
                              : handleStartInterview(interview.id)
                          }
                          disabled={!isInterviewSoon(interview.scheduled_at)}
                        >
                          <Video className="mr-2 h-4 w-4" />
                          {profile?.role === "candidate" ? "Join Interview" : "Start Interview"}
                        </Button>
                      )}
                      {interview.status === "in_progress" && (
                        <Button variant="destructive" onClick={() => handleJoinInterview(interview.id)}>
                          <Video className="mr-2 h-4 w-4" />
                          Resume Interview
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Completed Interviews */}
      {completedInterviews.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Completed Interviews
            </CardTitle>
            <CardDescription>Review past interview performance and feedback</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Position</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Scores</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {completedInterviews.map((interview) => (
                  <TableRow key={interview.id}>
                    <TableCell className="font-medium">{interview.application.job.title}</TableCell>
                    <TableCell>{interview.application.job.company.name}</TableCell>
                    <TableCell>{format(new Date(interview.scheduled_at), "PP")}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {interview.technical_score && (
                          <Badge variant="outline">Tech: {interview.technical_score}%</Badge>
                        )}
                        {interview.soft_skills_score && (
                          <Badge variant="outline">Soft: {interview.soft_skills_score}%</Badge>
                        )}
                        {interview.integrity_score && (
                          <Badge variant="outline">Integrity: {interview.integrity_score}%</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm">
                        <FileText className="mr-2 h-4 w-4" />
                        View Report
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
