"use client"

import { Badge } from "@/components/ui/badge"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Github, Linkedin, FileText, PlusCircle, XCircle } from "lucide-react"
import { GPTOSSService } from "@/lib/gpt-oss-service"

const gptOSSService = new GPTOSSService()

export function CandidateProfileForm() {
  const { profile, candidateProfile, updateProfile, updateCandidateProfile } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [fullName, setFullName] = useState(profile?.full_name || "")
  const [location, setLocation] = useState(candidateProfile?.location || "")
  const [experienceYears, setExperienceYears] = useState(candidateProfile?.experience_years?.toString() || "")
  const [githubUrl, setGithubUrl] = useState(candidateProfile?.github_url || "")
  const [linkedinUrl, setLinkedinUrl] = useState(candidateProfile?.linkedin_url || "")
  const [resumeFile, setResumeFile] = useState<File | null>(null)
  const [skills, setSkills] = useState<string[]>(candidateProfile?.skills?.map((s: any) => s.name) || [])
  const [newSkill, setNewSkill] = useState("")

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "")
    }
    if (candidateProfile) {
      setLocation(candidateProfile.location || "")
      setExperienceYears(candidateProfile.experience_years?.toString() || "")
      setGithubUrl(candidateProfile.github_url || "")
      setLinkedinUrl(candidateProfile.linkedin_url || "")
      setSkills(candidateProfile.skills?.map((s: any) => s.name) || [])
    }
  }, [profile, candidateProfile])

  const handleAddSkill = () => {
    if (newSkill.trim() && !skills.includes(newSkill.trim())) {
      setSkills([...skills, newSkill.trim()])
      setNewSkill("")
    }
  }

  const handleRemoveSkill = (skillToRemove: string) => {
    setSkills(skills.filter((skill) => skill !== skillToRemove))
  }

  const handleResumeUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setResumeFile(e.target.files[0])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Update general profile
      await updateProfile({ full_name: fullName })

      // Handle resume upload (simulated for now)
      let uploadedResumeUrl = candidateProfile?.resume_url || null
      if (resumeFile) {
        // In a real app, you'd upload to Supabase Storage here
        // For now, just set a placeholder URL
        uploadedResumeUrl = `/resumes/${profile?.id}-${resumeFile.name}`
        toast({
          title: "Resume Uploaded (Simulated)",
          description: `Resume ${resumeFile.name} would be uploaded to ${uploadedResumeUrl}`,
        })

        // Simulate AI parsing of resume skills
        const reader = new FileReader()
        reader.onload = async (event) => {
          const resumeText = event.target?.result as string
          if (resumeText) {
            try {
              const parsedSkills = await gptOSSService.parseResumeSkills(resumeText)
              const newSkills = parsedSkills.map((s: any) => s.name)
              setSkills((prev) => Array.from(new Set([...prev, ...newSkills])))
              toast({
                title: "AI Skill Parsing",
                description: "Skills extracted from your resume.",
              })
            } catch (aiError: any) {
              toast({
                title: "AI Skill Parsing Failed",
                description: aiError.message || "Could not extract skills from resume.",
                variant: "destructive",
              })
            }
          }
        }
        reader.readAsText(resumeFile) // Assuming text-based resume for parsing
      }

      // Update candidate-specific profile
      await updateCandidateProfile({
        location,
        experience_years: Number.parseInt(experienceYears) || null,
        github_url: githubUrl,
        linkedin_url: linkedinUrl,
        resume_url: uploadedResumeUrl,
        skills: skills.map((s) => ({ name: s, category: "unknown", proficiency: "intermediate", confidence: 0.5 })), // Basic structure
      })

      toast({
        title: "Profile Saved!",
        description: "Your profile has been successfully updated.",
      })
    } catch (error: any) {
      console.error("Error saving profile:", error)
      toast({
        title: "Error Saving Profile",
        description: error.message || "Failed to save profile.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle>My Profile</CardTitle>
        <CardDescription>Update your personal and professional details.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-6">
          <div className="grid gap-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="location">Location</Label>
              <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="experienceYears">Years of Experience (AI/ML)</Label>
              <Input
                id="experienceYears"
                type="number"
                value={experienceYears}
                onChange={(e) => setExperienceYears(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="skills">Skills</Label>
            <div className="flex flex-wrap gap-2">
              {skills.map((skill, index) => (
                <Badge key={index} variant="secondary" className="flex items-center gap-1">
                  {skill}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 p-0"
                    onClick={() => handleRemoveSkill(skill)}
                  >
                    <XCircle className="h-3 w-3" />
                    <span className="sr-only">Remove skill</span>
                  </Button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2 mt-2">
              <Input
                id="newSkill"
                placeholder="Add a new skill (e.g., PyTorch)"
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    handleAddSkill()
                  }
                }}
              />
              <Button type="button" onClick={handleAddSkill}>
                <PlusCircle className="h-4 w-4" />
                <span className="sr-only">Add skill</span>
              </Button>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="resume">Resume (PDF, DOCX, TXT)</Label>
            <div className="flex items-center gap-2">
              <Input id="resume" type="file" accept=".pdf,.docx,.txt" onChange={handleResumeUpload} />
              {candidateProfile?.resume_url && (
                <a
                  href={candidateProfile.resume_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline flex items-center gap-1"
                >
                  <FileText className="h-4 w-4" />
                  View Current
                </a>
              )}
            </div>
            {resumeFile && <p className="text-sm text-muted-foreground">Selected: {resumeFile.name}</p>}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="githubUrl">GitHub Profile URL</Label>
            <div className="flex items-center gap-2">
              <Input
                id="githubUrl"
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                placeholder="https://github.com/yourprofile"
              />
              <Button type="button" variant="outline" size="sm">
                <Github className="mr-2 h-4 w-4" />
                Import
              </Button>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="linkedinUrl">LinkedIn Profile URL</Label>
            <div className="flex items-center gap-2">
              <Input
                id="linkedinUrl"
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
                placeholder="https://linkedin.com/in/yourprofile"
              />
              <Button type="button" variant="outline" size="sm">
                <Linkedin className="mr-2 h-4 w-4" />
                Import
              </Button>
            </div>
          </div>

          <Button type="submit" disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Save Profile"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
