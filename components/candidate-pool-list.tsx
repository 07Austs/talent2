"use client"

import { Label } from "@/components/ui/label"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Loader2, User, Briefcase, MapPin, Mail, Calendar } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { GPTOSSService } from "@/lib/gpt-oss-service"

const gptOSSService = new GPTOSSService()

interface Candidate {
  id: string
  full_name: string
  email: string
  skills: string[]
  experience_years: number
  location: string
  ai_score: number
  resume_url: string | null
  github_url: string | null
  linkedin_url: string | null
  embedding: number[] | null
}

interface Job {
  id: string
  title: string
  requirements: string[]
  embedding: number[] | null
}

export function CandidatePoolList() {
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [jobs, setJobs] = useState<Job[]>([])
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    fetchJobsAndCandidates()
  }, [])

  useEffect(() => {
    if (selectedJobId) {
      rankCandidatesForJob(selectedJobId)
    }
  }, [selectedJobId, candidates, jobs])

  const fetchJobsAndCandidates = async () => {
    setLoading(true)
    try {
      const { data: jobsData, error: jobsError } = await supabase
        .from("jobs")
        .select("id, title, requirements, embedding")
      if (jobsError) throw jobsError
      setJobs(jobsData || [])

      const { data: candidatesData, error: candidatesError } = await supabase.from("candidates").select(`
          id,
          skills,
          experience_years,
          location,
          ai_score,
          resume_url,
          github_url,
          linkedin_url,
          embedding,
          profiles (full_name, email)
        `)
      if (candidatesError) throw candidatesError

      const formattedCandidates: Candidate[] = (candidatesData || []).map((c: any) => ({
        id: c.id,
        full_name: c.profiles?.full_name || "N/A",
        email: c.profiles?.email || "N/A",
        skills: c.skills || [],
        experience_years: c.experience_years || 0,
        location: c.location || "N/A",
        ai_score: c.ai_score || 0,
        resume_url: c.resume_url,
        github_url: c.github_url,
        linkedin_url: c.linkedin_url,
        embedding: c.embedding,
      }))
      setCandidates(formattedCandidates)

      if (jobsData && jobsData.length > 0) {
        setSelectedJobId(jobsData[0].id) // Select the first job by default
      }
    } catch (error: any) {
      console.error("Error fetching data:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to load jobs or candidates.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const rankCandidatesForJob = async (jobId: string) => {
    setLoading(true)
    try {
      const selectedJob = jobs.find((job) => job.id === jobId)
      if (!selectedJob) {
        toast({
          title: "Error",
          description: "Selected job not found.",
          variant: "destructive",
        })
        setLoading(false)
        return
      }

      const rankedCandidates = await Promise.all(
        candidates.map(async (candidate) => {
          if (!candidate.embedding || !selectedJob.embedding) {
            // If embeddings are missing, generate them (or skip for now)
            // For production, ensure embeddings are generated on profile/job creation
            console.warn(`Missing embedding for candidate ${candidate.id} or job ${selectedJob.id}. Skipping AI score.`)
            return { ...candidate, ai_match_score: 0 }
          }
          const score = await gptOSSService.calculateMatchScore(candidate.id, selectedJob.id)
          return { ...candidate, ai_match_score: score }
        }),
      )

      // Sort by AI match score descending
      setCandidates(rankedCandidates.sort((a, b) => (b.ai_match_score || 0) - (a.ai_match_score || 0)))
    } catch (error: any) {
      console.error("Error ranking candidates:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to rank candidates.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  if (loading && candidates.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>AI-Ranked Candidate Pool</CardTitle>
          <CardDescription>Loading candidates and jobs...</CardDescription>
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
        <CardTitle>AI-Ranked Candidate Pool</CardTitle>
        <CardDescription>Candidates matched and ranked by AI for your job postings.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex items-center gap-2">
          <Label htmlFor="job-select" className="sr-only">
            Select Job
          </Label>
          <select
            id="job-select"
            value={selectedJobId || ""}
            onChange={(e) => setSelectedJobId(e.target.value)}
            className="p-2 border rounded-md"
          >
            {jobs.length === 0 && <option value="">No jobs available</option>}
            {jobs.map((job) => (
              <option key={job.id} value={job.id}>
                {job.title}
              </option>
            ))}
          </select>
          {selectedJobId && (
            <Button onClick={() => rankCandidatesForJob(selectedJobId)} disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Re-rank Candidates
            </Button>
          )}
        </div>

        {candidates.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No candidates found.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Candidate</TableHead>
                <TableHead>AI Match Score</TableHead>
                <TableHead>Skills</TableHead>
                <TableHead>Experience</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {candidates.map((candidate) => (
                <TableRow key={candidate.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      {candidate.full_name}
                    </div>
                    <span className="text-xs text-muted-foreground">{candidate.email}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-lg font-bold">
                      {((candidate.ai_match_score || 0) * 100).toFixed(0)}%
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {candidate.skills.slice(0, 3).map((skill: any, idx) => (
                        <Badge key={idx} variant="outline">
                          {skill.name}
                        </Badge>
                      ))}
                      {candidate.skills.length > 3 && <Badge variant="outline">+{candidate.skills.length - 3}</Badge>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Briefcase className="inline-block h-4 w-4 mr-1 text-muted-foreground" />
                    {candidate.experience_years} Yrs
                  </TableCell>
                  <TableCell>
                    <MapPin className="inline-block h-4 w-4 mr-1 text-muted-foreground" />
                    {candidate.location}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        View Profile
                      </Button>
                      <Button variant="secondary" size="sm">
                        <Mail className="h-4 w-4" />
                      </Button>
                      <Button variant="secondary" size="sm">
                        <Calendar className="h-4 w-4" />
                      </Button>
                    </div>
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
