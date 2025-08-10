"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth } from "@/lib/auth-context"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { Loader2, CalendarPlus, User, Briefcase } from "lucide-react"

interface Application {
  id: string
  candidate_id: string
  job_id: string
  candidate_name: string
  job_title: string
}

export function InterviewScheduler() {
  const { profile, user } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [applications, setApplications] = useState<Application[]>([])
  const [selectedApplicationId, setSelectedApplicationId] = useState<string | null>(null)
  const [scheduledDateTime, setScheduledDateTime] = useState("")

  useEffect(() => {
    if (profile?.id) {
      fetchApplicationsForRecruiter(profile.id)
    }
  }, [profile])

  const fetchApplicationsForRecruiter = async (recruiterId: string) => {
    setLoading(true)
    try {
      const { data: recruiterJobs, error: jobsError } = await supabase
        .from("jobs")
        .select("id")
        .eq("recruiter_id", recruiterId)
      if (jobsError) throw jobsError
      const jobIds = recruiterJobs?.map((job) => job.id) || []

      const { data: applicationsData, error: applicationsError } = await supabase
        .from("applications")
        .select(
          `
          id,
          candidate_id,
          job_id,
          candidates (profiles (full_name)),
          jobs (title)
        `,
        )
        .in("job_id", jobIds)
        .eq("status", "shortlisted") // Only show shortlisted candidates
      if (applicationsError) throw applicationsError

      const formattedApplications: Application[] = (applicationsData || []).map((app: any) => ({
        id: app.id,
        candidate_id: app.candidate_id,
        job_id: app.job_id,
        candidate_name: app.candidates?.profiles?.full_name || "Unknown Candidate",
        job_title: app.jobs?.title || "Unknown Job",
      }))
      setApplications(formattedApplications)
      if (formattedApplications.length > 0) {
        setSelectedApplicationId(formattedApplications[0].id)
      }
    } catch (error: any) {
      console.error("Error fetching applications:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to load applications.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleScheduleInterview = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedApplicationId || !scheduledDateTime || !user) {
      toast({
        title: "Missing Information",
        description: "Please select an application and a date/time.",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      const { error: interviewError } = await supabase.from("interviews").insert({
        application_id: selectedApplicationId,
        interviewer_id: user.id,
        scheduled_at: new Date(scheduledDateTime).toISOString(),
        status: "scheduled",
      })

      if (interviewError) throw interviewError

      // Update application status to 'interview'
      const { error: updateAppError } = await supabase
        .from("applications")
        .update({ status: "interview" })
        .eq("id", selectedApplicationId)
      if (updateAppError) throw updateAppError

      toast({
        title: "Interview Scheduled!",
        description: "The interview has been successfully scheduled.",
      })
      setScheduledDateTime("")
      setSelectedApplicationId(null)
      fetchApplicationsForRecruiter(profile!.id) // Refresh list
    } catch (error: any) {
      console.error("Error scheduling interview:", error)
      toast({
        title: "Error Scheduling Interview",
        description: error.message || "Failed to schedule interview.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  if (loading && applications.length === 0) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Schedule Interview</CardTitle>
          <CardDescription>Loading applications...</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center items-center h-32">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Schedule Interview</CardTitle>
        <CardDescription>Select a shortlisted candidate and set a time for the interview.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleScheduleInterview} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="application">Select Candidate</Label>
            <Select value={selectedApplicationId || ""} onValueChange={setSelectedApplicationId}>
              <SelectTrigger id="application">
                <SelectValue placeholder="Select an application" />
              </SelectTrigger>
              <SelectContent>
                {applications.length === 0 && (
                  <SelectItem value="no-apps" disabled>
                    No shortlisted applications available
                  </SelectItem>
                )}
                {applications.map((app) => (
                  <SelectItem key={app.id} value={app.id}>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      {app.candidate_name}
                      <span className="text-muted-foreground text-xs">
                        (<Briefcase className="inline h-3 w-3" /> {app.job_title})
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="scheduledDateTime">Date and Time</Label>
            <Input
              id="scheduledDateTime"
              type="datetime-local"
              value={scheduledDateTime}
              onChange={(e) => setScheduledDateTime(e.target.value)}
              required
            />
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CalendarPlus className="mr-2 h-4 w-4" />}
            {loading ? "Scheduling..." : "Schedule Interview"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
