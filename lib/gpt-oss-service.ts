import { HfInference } from "@huggingface/inference"
import { HUGGINGFACE_CONFIG, type ReasoningLevel, type ModelSize } from "./huggingface-config"

class GPTOSSService {
  private hf: HfInference

  constructor() {
    if (!process.env.HUGGINGFACE_API_KEY) {
      throw new Error("HUGGINGFACE_API_KEY environment variable is required")
    }
    this.hf = new HfInference(process.env.HUGGINGFACE_API_KEY)
  }

  /**
   * Generate embeddings for text using Hugging Face sentence transformers
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.hf.featureExtraction({
        model: HUGGINGFACE_CONFIG.models.embedding,
        inputs: text,
      })

      // Handle different response formats
      if (Array.isArray(response)) {
        if (Array.isArray(response[0])) {
          return response[0] as number[]
        }
        return response as number[]
      }

      throw new Error("Unexpected embedding response format")
    } catch (error) {
      console.error("Error generating embedding:", error)
      throw new Error("Failed to generate embedding")
    }
  }

  /**
   * Generate text using GPT-OSS models with configurable reasoning
   */
  async generateText(
    prompt: string,
    options: {
      reasoning?: ReasoningLevel
      modelSize?: ModelSize
      maxTokens?: number
      temperature?: number
      systemPrompt?: string
    } = {},
  ): Promise<string> {
    const {
      reasoning = "medium",
      modelSize = "large",
      maxTokens = HUGGINGFACE_CONFIG.defaultParams.maxTokens,
      temperature = HUGGINGFACE_CONFIG.defaultParams.temperature,
      systemPrompt = "",
    } = options

    try {
      const model = HUGGINGFACE_CONFIG.models.textGeneration[modelSize]
      const reasoningInstruction = HUGGINGFACE_CONFIG.reasoningLevels[reasoning]

      // Construct the full prompt with system instructions
      const fullPrompt = [systemPrompt, reasoningInstruction, prompt].filter(Boolean).join("\n\n")

      const response = await this.hf.textGeneration({
        model,
        inputs: fullPrompt,
        parameters: {
          max_new_tokens: maxTokens,
          temperature,
          top_p: HUGGINGFACE_CONFIG.defaultParams.topP,
          return_full_text: false,
        },
      })

      return response.generated_text.trim()
    } catch (error) {
      console.error("Error generating text:", error)
      throw new Error("Failed to generate text")
    }
  }

  /**
   * Calculate semantic similarity between job and candidate profiles
   */
  async calculateMatchScore(jobEmbedding: number[], candidateEmbedding: number[]): Promise<number> {
    try {
      // Calculate cosine similarity
      const dotProduct = jobEmbedding.reduce((sum, a, i) => sum + a * candidateEmbedding[i], 0)
      const magnitudeA = Math.sqrt(jobEmbedding.reduce((sum, a) => sum + a * a, 0))
      const magnitudeB = Math.sqrt(candidateEmbedding.reduce((sum, b) => sum + b * b, 0))

      const similarity = dotProduct / (magnitudeA * magnitudeB)

      // Convert to percentage (0-100)
      return Math.max(0, Math.min(100, (similarity + 1) * 50))
    } catch (error) {
      console.error("Error calculating match score:", error)
      return 0
    }
  }

  /**
   * Parse resume text and extract skills using AI
   */
  async parseResumeSkills(resumeText: string): Promise<string[]> {
    try {
      const prompt = `
        Analyze the following resume and extract all technical skills, programming languages, frameworks, tools, and technologies mentioned. 
        Return only a JSON array of skill names, no explanations.
        
        Resume:
        ${resumeText}
        
        Skills (JSON array only):
      `

      const response = await this.generateText(prompt, {
        reasoning: "low",
        modelSize: "small",
        maxTokens: 500,
        temperature: 0.3,
      })

      // Try to parse JSON response
      try {
        const skills = JSON.parse(response)
        return Array.isArray(skills) ? skills : []
      } catch {
        // Fallback: extract skills from text response
        const skillMatches = response.match(/["']([^"']+)["']/g)
        return skillMatches ? skillMatches.map((s) => s.replace(/["']/g, "")) : []
      }
    } catch (error) {
      console.error("Error parsing resume skills:", error)
      return []
    }
  }

  /**
   * Generate interview questions based on job requirements
   */
  async generateInterviewQuestions(
    jobTitle: string,
    requirements: string[],
    difficulty: "junior" | "mid" | "senior" = "mid",
  ): Promise<Array<{ question: string; type: "technical" | "behavioral"; expectedAnswer?: string }>> {
    try {
      const prompt = `
        Generate 5 interview questions for a ${difficulty} level ${jobTitle} position.
        Requirements: ${requirements.join(", ")}
        
        Create a mix of technical and behavioral questions. For technical questions, provide expected answer guidelines.
        
        Return as JSON array with format:
        [{"question": "...", "type": "technical|behavioral", "expectedAnswer": "..."}]
      `

      const response = await this.generateText(prompt, {
        reasoning: "high",
        modelSize: "large",
        maxTokens: 1500,
        temperature: 0.8,
      })

      try {
        const questions = JSON.parse(response)
        return Array.isArray(questions) ? questions : []
      } catch {
        // Fallback: return default questions
        return [
          {
            question: `Tell me about your experience with ${requirements[0] || "the required technologies"}.`,
            type: "technical" as const,
          },
          {
            question: "Describe a challenging project you worked on and how you overcame obstacles.",
            type: "behavioral" as const,
          },
        ]
      }
    } catch (error) {
      console.error("Error generating interview questions:", error)
      return []
    }
  }

  /**
   * Analyze interview response for integrity and quality
   */
  async analyzeInterviewResponse(
    question: string,
    response: string,
    expectedAnswer?: string,
  ): Promise<{
    integrityScore: number
    technicalScore: number
    feedback: string
    redFlags: string[]
  }> {
    try {
      const prompt = `
        Analyze this interview response for integrity and technical accuracy:
        
        Question: ${question}
        Response: ${response}
        ${expectedAnswer ? `Expected Answer Guidelines: ${expectedAnswer}` : ""}
        
        Evaluate:
        1. Integrity (0-100): Does the response seem genuine and not copy-pasted?
        2. Technical Score (0-100): How accurate and complete is the technical content?
        3. Red flags: Any signs of cheating, inconsistency, or lack of understanding?
        
        Return JSON:
        {
          "integrityScore": number,
          "technicalScore": number,
          "feedback": "constructive feedback",
          "redFlags": ["flag1", "flag2"]
        }
      `

      const analysisResponse = await this.generateText(prompt, {
        reasoning: "high",
        modelSize: "large",
        maxTokens: 800,
        temperature: 0.3,
      })

      try {
        return JSON.parse(analysisResponse)
      } catch {
        // Fallback analysis
        return {
          integrityScore: 75,
          technicalScore: 70,
          feedback: "Response analyzed. Please review manually for detailed assessment.",
          redFlags: [],
        }
      }
    } catch (error) {
      console.error("Error analyzing interview response:", error)
      return {
        integrityScore: 50,
        technicalScore: 50,
        feedback: "Analysis failed. Manual review required.",
        redFlags: ["Analysis error"],
      }
    }
  }

  /**
   * Generate dynamic coding challenge
   */
  async generateCodingChallenge(
    skills: string[],
    difficulty: "easy" | "medium" | "hard" = "medium",
    sessionId: string,
  ): Promise<{
    title: string
    description: string
    constraints: string[]
    examples: Array<{ input: string; output: string }>
    hints: string[]
    timeLimit: number
  }> {
    try {
      const prompt = `
        Generate a unique coding challenge for session ${sessionId}.
        Skills: ${skills.join(", ")}
        Difficulty: ${difficulty}
        
        Create a problem that tests practical programming skills relevant to the given technologies.
        Make it unique and not easily searchable online.
        
        Return JSON:
        {
          "title": "Challenge Title",
          "description": "Detailed problem description",
          "constraints": ["constraint1", "constraint2"],
          "examples": [{"input": "example input", "output": "expected output"}],
          "hints": ["hint1", "hint2"],
          "timeLimit": minutes
        }
      `

      const response = await this.generateText(prompt, {
        reasoning: "high",
        modelSize: "large",
        maxTokens: 1200,
        temperature: 0.9, // Higher creativity for unique challenges
      })

      try {
        return JSON.parse(response)
      } catch {
        // Fallback challenge
        return {
          title: "Array Processing Challenge",
          description:
            "Write a function that processes an array of numbers and returns the sum of even numbers multiplied by their indices.",
          constraints: ["Array length: 1-1000", "Numbers: -1000 to 1000"],
          examples: [{ input: "[1, 2, 3, 4]", output: "6 (2*1 + 4*3)" }],
          hints: ["Consider using array iteration", "Remember to check for even numbers"],
          timeLimit: 30,
        }
      }
    } catch (error) {
      console.error("Error generating coding challenge:", error)
      throw new Error("Failed to generate coding challenge")
    }
  }
}

export const gptOSSService = new GPTOSSService()
