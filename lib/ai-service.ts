import { HfInference } from "@huggingface/inference"
import { z } from "zod"
import { supabase } from "./supabase"

const SkillsSchema = z.object({
  skills: z.array(
    z.object({
      name: z.string(),
      category: z.enum(["programming", "ml_framework", "cloud", "database", "soft_skill"]),
      proficiency: z.enum(["beginner", "intermediate", "advanced", "expert"]),
      confidence: z.number().min(0).max(1),
    }),
  ),
})

const InterviewChallengeSchema = z.object({
  type: z.enum(["coding", "system_design", "ml_debugging", "ethics", "collaboration"]),
  title: z.string(),
  description: z.string(),
  problem_statement: z.string(),
  expected_approach: z.string(),
  evaluation_criteria: z.array(z.string()),
  time_limit_minutes: z.number(),
  difficulty: z.enum(["easy", "medium", "hard"]),
  anti_cheat_elements: z.array(z.string()),
})

// Initialize Hugging Face client
const hf = new HfInference(process.env.HUGGINGFACE_API_KEY)

// Update the AIService class methods:

export class AIService {
  private static instance: AIService
  private hfClient: HfInference

  constructor() {
    this.hfClient = new HfInference(process.env.HUGGINGFACE_API_KEY)
  }

  static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService()
    }
    return AIService.instance
  }

  async generateEmbedding(text: string): Promise<number[]> {
    try {
      // Use Hugging Face's sentence-transformers for embeddings
      const response = await this.hfClient.featureExtraction({
        model: "sentence-transformers/all-MiniLM-L6-v2",
        inputs: text,
      })

      // Handle the response format
      if (Array.isArray(response) && Array.isArray(response[0])) {
        return response[0] as number[]
      }
      return response as number[]
    } catch (error) {
      console.error("Error generating embedding:", error)
      throw error
    }
  }

  async parseResumeSkills(resumeText: string) {
    try {
      const prompt = `
        Analyze this resume and extract AI/ML engineering skills with proficiency levels.
        Focus on: Programming languages, ML frameworks, cloud platforms, databases, and soft skills.
        
        Resume text:
        ${resumeText}
        
        Rate proficiency based on context clues like years of experience, project complexity, and explicit mentions.
        
        Respond with a JSON object containing an array of skills, each with:
        - name: string
        - category: "programming" | "ml_framework" | "cloud" | "database" | "soft_skill"
        - proficiency: "beginner" | "intermediate" | "advanced" | "expert"
        - confidence: number between 0 and 1
        
        Example format:
        {
          "skills": [
            {
              "name": "Python",
              "category": "programming",
              "proficiency": "advanced",
              "confidence": 0.9
            }
          ]
        }
      `

      const response = await this.hfClient.textGeneration({
        model: "openai/gpt-oss-120b",
        inputs: prompt,
        parameters: {
          max_new_tokens: 1000,
          temperature: 0.3,
          return_full_text: false,
        },
      })

      // Parse the JSON response
      const jsonMatch = response.generated_text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        return parsed.skills || []
      }

      return []
    } catch (error) {
      console.error("Error parsing resume skills:", error)
      throw error
    }
  }

  async calculateMatchScore(candidateId: string, jobId: string): Promise<number> {
    try {
      // Get candidate and job embeddings
      const { data: candidate } = await supabase
        .from("candidates")
        .select("embedding, skills, experience_years")
        .eq("id", candidateId)
        .single()

      const { data: job } = await supabase
        .from("jobs")
        .select("embedding, requirements, title, description")
        .eq("id", jobId)
        .single()

      if (!candidate || !job) {
        throw new Error("Candidate or job not found")
      }

      // Calculate semantic similarity using cosine similarity
      const similarity = this.cosineSimilarity(candidate.embedding, job.embedding)

      // Apply additional scoring factors
      const skillMatch = this.calculateSkillMatch(candidate.skills, job.requirements)
      const experienceBonus = this.calculateExperienceBonus(candidate.experience_years, job.requirements)

      // Weighted final score
      const finalScore = similarity * 0.4 + skillMatch * 0.4 + experienceBonus * 0.2

      return Math.min(Math.max(finalScore, 0), 1) // Clamp between 0 and 1
    } catch (error) {
      console.error("Error calculating match score:", error)
      return 0
    }
  }

  async generateInterviewChallenge(candidateSkills: any[], jobRequirements: any[], sessionId: string) {
    try {
      const prompt = `
        Generate a unique, dynamic interview challenge for an AI/ML engineer.
        
        Candidate Skills: ${JSON.stringify(candidateSkills)}
        Job Requirements: ${JSON.stringify(jobRequirements)}
        Session ID: ${sessionId} (use this to ensure uniqueness)
        
        ANTI-CHEATING REQUIREMENTS:
        1. Make the problem unique to this session - incorporate session ID into the problem context
        2. Include progressive revelation elements (candidate can't see full problem at once)
        3. Add real-time adaptation requirements (problem evolves based on candidate responses)
        4. Include verbal explanation requirements (candidate must explain while coding)
        5. Add surprise elements that appear mid-challenge
        
        Focus on practical AI/ML scenarios that test both technical skills and problem-solving approach.
        Make it engaging and realistic to actual work scenarios.
        
        Respond with a JSON object containing:
        {
          "type": "coding" | "system_design" | "ml_debugging" | "ethics" | "collaboration",
          "title": "string",
          "description": "string", 
          "problem_statement": "string",
          "expected_approach": "string",
          "evaluation_criteria": ["string"],
          "time_limit_minutes": number,
          "difficulty": "easy" | "medium" | "hard",
          "anti_cheat_elements": ["string"]
        }
      `

      const response = await this.hfClient.textGeneration({
        model: "openai/gpt-oss-120b",
        inputs: prompt,
        parameters: {
          max_new_tokens: 1500,
          temperature: 0.7,
          return_full_text: false,
        },
      })

      // Parse the JSON response
      const jsonMatch = response.generated_text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }

      throw new Error("Failed to parse challenge response")
    } catch (error) {
      console.error("Error generating interview challenge:", error)
      throw error
    }
  }

  async analyzeIntegrityFlags(sessionData: any): Promise<{
    score: number
    flags: string[]
    recommendations: string[]
  }> {
    try {
      const prompt = `
        Analyze this interview session data for potential integrity issues:
        
        ${JSON.stringify(sessionData)}
        
        Look for:
        1. Sudden solution jumps without logical progression
        2. Copy-paste patterns in code
        3. Inconsistency between verbal explanations and code
        4. Unusual timing patterns
        5. Generic or templated responses
        
        Respond with a JSON object containing:
        {
          "score": number between 0 and 1 (where 1 is highest integrity),
          "flags": ["string array of specific flags found"],
          "recommendations": ["string array of follow-up recommendations"]
        }
      `

      const response = await this.hfClient.textGeneration({
        model: "openai/gpt-oss-120b",
        inputs: prompt,
        parameters: {
          max_new_tokens: 800,
          temperature: 0.3,
          return_full_text: false,
        },
      })

      // Parse the JSON response
      const jsonMatch = response.generated_text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }

      return {
        score: 0.5,
        flags: ["Analysis failed"],
        recommendations: ["Manual review required"],
      }
    } catch (error) {
      console.error("Error analyzing integrity:", error)
      return {
        score: 0.5,
        flags: ["Analysis failed"],
        recommendations: ["Manual review required"],
      }
    }
  }

  // Keep the existing helper methods unchanged
  private cosineSimilarity(a: number[], b: number[]): number {
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0)
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0))
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0))
    return dotProduct / (magnitudeA * magnitudeB)
  }

  private calculateSkillMatch(candidateSkills: any[], jobRequirements: any[]): number {
    if (!candidateSkills?.length || !jobRequirements?.length) return 0

    const candidateSkillNames = candidateSkills.map((s) => s.name.toLowerCase())
    const requiredSkillNames = jobRequirements.map((r) => r.toLowerCase())

    const matches = requiredSkillNames.filter((req) =>
      candidateSkillNames.some((cand) => cand.includes(req) || req.includes(cand)),
    )

    return matches.length / requiredSkillNames.length
  }

  private calculateExperienceBonus(candidateYears: number, jobRequirements: any[]): number {
    // Extract experience requirements from job requirements
    const experienceReq = jobRequirements.find((req) => typeof req === "string" && req.toLowerCase().includes("year"))

    if (!experienceReq || !candidateYears) return 0.5

    const reqYears = Number.parseInt(experienceReq.match(/\d+/)?.[0] || "0")

    if (candidateYears >= reqYears) return 1
    if (candidateYears >= reqYears * 0.7) return 0.8
    if (candidateYears >= reqYears * 0.5) return 0.6
    return 0.3
  }
}

export const aiService = AIService.getInstance()
