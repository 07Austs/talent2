"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from "@/lib/auth-context"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { PlusCircle, Loader2 } from "lucide-react"
import { GPTOSSService } from "@/lib/gpt-oss-service"

const gptOSSService = new GPTOSSService()

export function JobPostForm() {
  const { profile, user } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [jobData, setJobData] = useState({
    title: "",
    description: "",
    requirements: "", // Comma-separated string for now
    location: "",
    salary_min: "",
    salary_max: "",
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target
    setJobData((prev) => ({ ...prev, [id]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || profile?.role !== "recruiter") {
      toast({
        title: "Unauthorized",
        description: "Only recruiters can post jobs.",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      // Simulate company ID for now
      const companyId = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11" // Replace with actual company ID logic

      // Generate embedding for job description and requirements
      const jobText = `${jobData.title} ${jobData.description} ${jobData.requirements}`
      const embedding = await gptOSSService.generateEmbedding(jobText)

      const { error } = await supabase.from("jobs").insert({
        company_id: companyId,
        recruiter_id: user.id,
        title: jobData.title,
        description: jobData.description,
        requirements: jobData.requirements.split(",").map((req) => req.trim()),
        location: jobData.location,
        salary_min: jobData.salary_min ? Number.parseInt(jobData.salary_min) : null,
        salary_max: jobData.salary_max ? Number.parseInt(jobData.salary_max) : null,
        embedding: embedding,
      })

      if (error) throw error

      toast({
        title: "Job Posted!",
        description: "Your job listing has been successfully created.",
      })
      setJobData({
        title: "",
        description: "",
        requirements: "",
        location: "",
        salary_min: "",
        salary_max: "",
      })
    } catch (error: any) {
      console.error("Error posting job:", error)
      toast({
        title: "Error Posting Job",
        description: error.message || "Failed to create job listing.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Post a New Job</CardTitle>
        <CardDescription>Fill in the details to create a new job listing for AI talent.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="title">Job Title</Label>
            <Input id="title" value={jobData.title} onChange={handleChange} required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">Job Description</Label>
            <Textarea id="description" value={jobData.description} onChange={handleChange} required rows={5} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="requirements">Key Requirements (comma-separated)</Label>
            <Input
              id="requirements"
              value={jobData.requirements}
              onChange={handleChange}
              placeholder="e.g., PyTorch, TensorFlow, MLOps, LLMOps"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="location">Location</Label>
              <Input id="location" value={jobData.location} onChange={handleChange} placeholder="e.g., Remote, NYC" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="salary_min">Min Salary ($)</Label>
              <Input id="salary_min" type="number" value={jobData.salary_min} onChange={handleChange} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="salary_max">Max Salary ($)</Label>
              <Input id="salary_max" type="number" value={jobData.salary_max} onChange={handleChange} />
            </div>
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
            {loading ? "Posting..." : "Post Job"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
