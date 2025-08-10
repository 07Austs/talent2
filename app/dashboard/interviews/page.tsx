"use client"

import { useAuth } from "@/lib/auth-context"
import { InterviewScheduler } from "@/components/interview-scheduler"
import { UpcomingInterviews } from "@/components/upcoming-interviews"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function InterviewsPage() {
  const { profile } = useAuth()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Interviews</h1>
        <p className="text-muted-foreground">Manage and view your interview schedule.</p>
      </div>

      {profile?.role === "recruiter" ? (
        <Tabs defaultValue="upcoming" className="space-y-4">
          <TabsList>
            <TabsTrigger value="upcoming">Upcoming Interviews</TabsTrigger>
            <TabsTrigger value="schedule">Schedule New Interview</TabsTrigger>
          </TabsList>
          <TabsContent value="upcoming">
            <UpcomingInterviews />
          </TabsContent>
          <TabsContent value="schedule">
            <InterviewScheduler />
          </TabsContent>
        </Tabs>
      ) : (
        <UpcomingInterviews />
      )}
    </div>
  )
}
