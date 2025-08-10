export type ReasoningLevel = "low" | "medium" | "high"
export type ModelSize = "small" | "large"

export const HUGGINGFACE_CONFIG = {
  models: {
    // Text generation models
    textGeneration: {
      small: "openai/gpt-oss-20b",
      large: "openai/gpt-oss-120b",
    },
    // Embedding model for semantic similarity
    embedding: "sentence-transformers/all-MiniLM-L6-v2",
    // Code analysis model
    codeAnalysis: "microsoft/codebert-base",
  },

  // Reasoning level configurations
  reasoningLevels: {
    low: "Reasoning: low - Provide quick, direct responses with minimal explanation.",
    medium: "Reasoning: medium - Balance speed with thoughtful analysis and clear explanations.",
    high: "Reasoning: high - Provide deep, detailed analysis with comprehensive reasoning and multiple perspectives.",
  },

  // Default parameters for text generation
  defaultParams: {
    maxTokens: 1000,
    temperature: 0.7,
    topP: 0.9,
    topK: 50,
  },

  // Rate limiting and retry configuration
  rateLimiting: {
    maxRetries: 3,
    retryDelay: 1000, // milliseconds
    maxRequestsPerMinute: 60,
  },

  // Model-specific configurations
  modelConfigs: {
    "openai/gpt-oss-120b": {
      maxTokens: 2000,
      temperature: 0.8,
      bestFor: ["complex reasoning", "code generation", "interview analysis"],
    },
    "openai/gpt-oss-20b": {
      maxTokens: 1000,
      temperature: 0.6,
      bestFor: ["quick responses", "skill extraction", "simple analysis"],
    },
  },
} as const

// Utility functions for configuration
export function getModelForTask(task: "reasoning" | "extraction" | "generation" | "analysis"): string {
  switch (task) {
    case "reasoning":
    case "analysis":
      return HUGGINGFACE_CONFIG.models.textGeneration.large
    case "extraction":
      return HUGGINGFACE_CONFIG.models.textGeneration.small
    case "generation":
      return HUGGINGFACE_CONFIG.models.textGeneration.large
    default:
      return HUGGINGFACE_CONFIG.models.textGeneration.medium
  }
}

export function formatPromptWithReasoning(prompt: string, level: ReasoningLevel): string {
  const reasoningInstruction = HUGGINGFACE_CONFIG.reasoningLevels[level]
  return `${reasoningInstruction}\n\n${prompt}`
}

export function extractJsonFromResponse(response: string): any {
  try {
    // Try to find JSON in the response
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }

    // Try to parse the entire response as JSON
    return JSON.parse(response)
  } catch (error) {
    console.error("Failed to extract JSON from response:", error)
    return null
  }
}

export function handleHfError(error: any): string {
  if (error.message?.includes("rate limit")) {
    return "Rate limit exceeded. Please try again in a moment."
  }
  if (error.message?.includes("model")) {
    return "Model temporarily unavailable. Please try again."
  }
  if (error.message?.includes("timeout")) {
    return "Request timed out. Please try again."
  }
  return error.message || "An unexpected error occurred."
}
