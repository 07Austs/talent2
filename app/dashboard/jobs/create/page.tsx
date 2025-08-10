import { JobPostForm } from "@/components/job-post-form"

export default function CreateJobPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Create New Job Posting</h1>
        <p className="text-muted-foreground">Publish a new job opening for AI talent.</p>
      </div>
      <JobPostForm />
    </div>
  )
}
