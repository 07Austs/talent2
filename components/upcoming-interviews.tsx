"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Loader2, Calendar, Clock, User, Briefcase, Play } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface Interview {
  id: string
  scheduled_at: string
  status: "scheduled" | "in_progress" | "completed" | "cancelled"
  candidate_name: string
  job_title: string
  interviewer_name: string
}

export function UpcomingInterviews() {
  const { profile, user } = useAuth()
  const { toast } = useToast()
  const [interviews, setInterviews] = useState<Interview[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (profile?.id) {
      fetchInterviews(profile.id, profile.role)
    }
  }, [profile])

  const fetchInterviews = async (userId: string, role: string) => {
    setLoading(true)
    try {
      let query = supabase.from("interviews").select(
        `
          id,
          scheduled_at,
          status,
          applications (
            jobs (title),
            candidates (profiles (full_name))
          ),
          profiles (full_name)
        `,
      )

      if (role === "candidate") {
        query = query.eq("applications.candidates.profile_id", userId)
      } else if (role === "recruiter") {
        query = query.eq("interviewer_id", userId)
      } else {
        // Admins can see all interviews
      }

      const { data, error } = await query.order("scheduled_at", { ascending: true })

      if (error) throw error

      const formattedInterviews: Interview[] = (data || []).map((i: any) => ({
        id: i.id,
        scheduled_at: i.scheduled_at,
        status: i.status,
        candidate_name: i.applications?.candidates?.profiles?.full_name || "N/A",
        job_title: i.applications?.jobs?.title || "N/A",
        interviewer_name: i.profiles?.full_name || "N/A",
      }))
      setInterviews(formattedInterviews)
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "scheduled":
        return "bg-blue-100 text-blue-800"
      case "in_progress":
        return "bg-yellow-100 text-yellow-800"
      case "completed":
        return "bg-green-100 text-green-800"
      case "cancelled":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const handleStartInterview = (interviewId: string) => {
    // In a real application, this would navigate to the interview session page
    // and update the interview status to 'in_progress'
    toast({
      title: "Starting Interview",
      description: `Navigating to interview session ${interviewId}... (Simulated)`,
    })
    console.log(`Simulating start of interview: ${interviewId}`)
    // Example: router.push(`/interview/${interviewId}`);
  }

  if (loading && interviews.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Upcoming Interviews</CardTitle>
          <CardDescription>Loading your interview schedule...</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center items-center h-48">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Upcoming Interviews</CardTitle>
        <CardDescription>Your scheduled AI-powered interview sessions.</CardDescription>
      </CardHeader>
      <CardContent>
        {interviews.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No interviews scheduled.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Candidate</TableHead>
                <TableHead>Job Title</TableHead>
                <TableHead>Interviewer</TableHead>
                <TableHead>Scheduled At</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {interviews.map((interview) => (
                <TableRow key={interview.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      {interview.candidate_name}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Briefcase className="inline-block h-4 w-4 mr-1 text-muted-foreground" />
                    {interview.job_title}
                  </TableCell>
                  <TableCell>{interview.interviewer_name}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      {new Date(interview.scheduled_at).toLocaleDateString()}
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      {new Date(interview.scheduled_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={getStatusColor(interview.status)}>
                      {interview.status.replace("_", " ").charAt(0).toUpperCase() +
                        interview.status.replace("_", " ").slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {interview.status === "scheduled" && (
                      <Button size="sm" onClick={() => handleStartInterview(interview.id)}>
                        <Play className="mr-2 h-4 w-4" />
                        Start Interview
                      </Button>
                    )}
                    {/* Add other actions like "View Details", "Reschedule", "Cancel" */}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
