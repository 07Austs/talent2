"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock, User, Video } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

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
      }
    }
  }
  interviewer: {
    full_name: string
  }
}

export function UpcomingInterviews() {
  const { user, profile } = useAuth()
  const { toast } = useToast()
  const [interviews, setInterviews] = useState<Interview[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user && profile) {
      fetchInterviews()
    }
  }, [user, profile])

  const fetchInterviews = async () => {
    try {
      let query = supabase
        .from("interviews")
        .select(`
          id,
          scheduled_at,
          status,
          application:applications(
            job:jobs(
              title,
              company:companies(name)
            ),
            candidate:candidates(
              profile:profiles(full_name)
            )
          ),
          interviewer:profiles!interviews_interviewer_id_fkey(full_name)
        `)
        .in("status", ["scheduled", "in_progress"])
        .order("scheduled_at", { ascending: true })

      // Filter based on user role
      if (profile?.role === "candidate") {
        // For candidates, show interviews where they are the candidate
        query = query.eq("application.candidate.profile_id", user!.id)
      } else if (profile?.role === "recruiter") {
        // For recruiters, show interviews they are conducting
        query = query.eq("interviewer_id", user!.id)
      }

      const { data, error } = await query

      if (error) throw error
      setInterviews(data || [])
    } catch (error) {
      console.error("Error fetching interviews:", error)
      toast({
        title: "Error",
        description: "Failed to load interviews",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const startInterview = async (interviewId: string) => {
    try {
      const { error } = await supabase.from("interviews").update({ status: "in_progress" }).eq("id", interviewId)

      if (error) throw error

      toast({
        title: "Interview Started",
        description: "Redirecting to interview session...",
      })

      // In a real app, this would redirect to the interview session
      // For now, we'll just show a toast
      setTimeout(() => {
        toast({
          title: "Interview Session",
          description: "This would open the real-time interview interface",
        })
      }, 1000)
    } catch (error) {
      console.error("Error starting interview:", error)
      toast({
        title: "Error",
        description: "Failed to start interview",
        variant: "destructive",
      })
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

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/4"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (interviews.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No upcoming interviews</h3>
          <p className="text-gray-500">
            {profile?.role === "candidate"
              ? "You don't have any scheduled interviews at the moment."
              : "You don't have any interviews to conduct at the moment."}
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {interviews.map((interview) => {
        const { date, time } = formatDateTime(interview.scheduled_at)
        const isCandidate = profile?.role === "candidate"

        return (
          <Card key={interview.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{interview.application.job.title}</CardTitle>
                  <CardDescription>{interview.application.job.company.name}</CardDescription>
                </div>
                <Badge className={getStatusColor(interview.status)}>{interview.status.replace("_", " ")}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>{date}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>{time}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-sm text-gray-600">
                  <User className="h-4 w-4" />
                  <span>
                    {isCandidate
                      ? `Interviewer: ${interview.interviewer.full_name}`
                      : `Candidate: ${interview.application.candidate.profile.full_name}`}
                  </span>
                </div>

                {interview.status === "scheduled" && (
                  <div className="pt-2">
                    <Button onClick={() => startInterview(interview.id)} className="w-full sm:w-auto">
                      <Video className="h-4 w-4 mr-2" />
                      Start Interview
                    </Button>
                  </div>
                )}

                {interview.status === "in_progress" && (
                  <div className="pt-2">
                    <Button variant="outline" className="w-full sm:w-auto bg-transparent">
                      <Video className="h-4 w-4 mr-2" />
                      Join Interview
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
