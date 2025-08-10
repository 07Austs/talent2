"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Calendar, Clock, User, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface Application {
  id: string
  candidate: {
    id: string
    profile: {
      full_name: string
      email: string
    }
  }
  job: {
    title: string
    company: {
      name: string
    }
  }
  status: string
}

export function InterviewScheduler() {
  const { profile, user } = useAuth()
  const { toast } = useToast()
  const [applications, setApplications] = useState<Application[]>([])
  const [selectedApplication, setSelectedApplication] = useState<string>("")
  const [scheduledDate, setScheduledDate] = useState("")
  const [scheduledTime, setScheduledTime] = useState("")
  const [interviewType, setInterviewType] = useState("technical")
  const [notes, setNotes] = useState("")
  const [loading, setLoading] = useState(false)
  const [fetchingApplications, setFetchingApplications] = useState(true)

  useEffect(() => {
    if (profile?.role === "recruiter" && user) {
      fetchShortlistedApplications()
    }
  }, [profile, user])

  const fetchShortlistedApplications = async () => {
    if (!user) return

    setFetchingApplications(true)
    try {
      // Get recruiter's jobs first
      const { data: jobs, error: jobsError } = await supabase.from("jobs").select("id").eq("recruiter_id", user.id)

      if (jobsError) throw jobsError

      const jobIds = jobs?.map((job) => job.id) || []

      if (jobIds.length === 0) {
        setApplications([])
        return
      }

      // Get shortlisted applications for these jobs
      const { data: applicationsData, error: applicationsError } = await supabase
        .from("applications")
        .select(`
          id,
          status,
          candidates (
            id,
            profiles (full_name, email)
          ),
          jobs (
            title,
            companies (name)
          )
        `)
        .in("job_id", jobIds)
        .eq("status", "shortlisted")

      if (applicationsError) throw applicationsError

      // Transform data to match our interface
      const transformedApplications: Application[] = (applicationsData || []).map((app: any) => ({
        id: app.id,
        status: app.status,
        candidate: {
          id: app.candidates?.id || "",
          profile: {
            full_name: app.candidates?.profiles?.full_name || "Unknown",
            email: app.candidates?.profiles?.email || "",
          },
        },
        job: {
          title: app.jobs?.title || "Unknown Position",
          company: {
            name: app.jobs?.companies?.name || "Unknown Company",
          },
        },
      }))

      setApplications(transformedApplications)
    } catch (error: any) {
      console.error("Error fetching applications:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to load applications.",
        variant: "destructive",
      })
    } finally {
      setFetchingApplications(false)
    }
  }

  const handleScheduleInterview = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !selectedApplication || !scheduledDate || !scheduledTime) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      // Combine date and time
      const scheduledDateTime = new Date(`${scheduledDate}T${scheduledTime}`)

      // Create interview record
      const { error: interviewError } = await supabase.from("interviews").insert({
        application_id: selectedApplication,
        interviewer_id: user.id,
        scheduled_at: scheduledDateTime.toISOString(),
        status: "scheduled",
        session_data: {
          type: interviewType,
          notes: notes,
          created_at: new Date().toISOString(),
        },
      })

      if (interviewError) throw interviewError

      // Update application status to 'interview'
      const { error: updateError } = await supabase
        .from("applications")
        .update({ status: "interview" })
        .eq("id", selectedApplication)

      if (updateError) throw updateError

      toast({
        title: "Interview Scheduled!",
        description: "The candidate will be notified about the interview.",
      })

      // Reset form
      setSelectedApplication("")
      setScheduledDate("")
      setScheduledTime("")
      setInterviewType("technical")
      setNotes("")

      // Refresh applications list
      fetchShortlistedApplications()
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

  if (profile?.role !== "recruiter") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Access Denied</CardTitle>
          <CardDescription>Only recruiters can schedule interviews.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (fetchingApplications) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Schedule Interview</CardTitle>
          <CardDescription>Loading shortlisted candidates...</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center items-center h-48">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Schedule Interview
        </CardTitle>
        <CardDescription>Schedule interviews with shortlisted candidates</CardDescription>
      </CardHeader>
      <CardContent>
        {applications.length === 0 ? (
          <div className="text-center py-8">
            <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Shortlisted Candidates</h3>
            <p className="text-muted-foreground">
              Shortlist candidates from your job applications to schedule interviews.
            </p>
          </div>
        ) : (
          <form onSubmit={handleScheduleInterview} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="candidate">Select Candidate</Label>
              <Select value={selectedApplication} onValueChange={setSelectedApplication} required>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a shortlisted candidate" />
                </SelectTrigger>
                <SelectContent>
                  {applications.map((app) => (
                    <SelectItem key={app.id} value={app.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{app.candidate.profile.full_name}</span>
                        <span className="text-sm text-muted-foreground">
                          {app.job.title} at {app.job.company.name}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Interview Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="time">Interview Time</Label>
                <Input
                  id="time"
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Interview Type</Label>
              <Select value={interviewType} onValueChange={setInterviewType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="technical">Technical Interview</SelectItem>
                  <SelectItem value="behavioral">Behavioral Interview</SelectItem>
                  <SelectItem value="system_design">System Design</SelectItem>
                  <SelectItem value="coding_challenge">Coding Challenge</SelectItem>
                  <SelectItem value="final_round">Final Round</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Interview Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Add any specific instructions or topics to cover..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Scheduling...
                </>
              ) : (
                <>
                  <Clock className="mr-2 h-4 w-4" />
                  Schedule Interview
                </>
              )}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  )
}
