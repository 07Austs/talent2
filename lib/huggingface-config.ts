export const HUGGINGFACE_CONFIG = {
  // Model configurations
  models: {
    embedding: "sentence-transformers/all-MiniLM-L6-v2",
    textGeneration: {
      small: "openai/gpt-oss-20b", // For quick tasks
      large: "openai/gpt-oss-120b", // For complex reasoning
    },
  },

  // API configuration
  apiUrl: "https://api-inference.huggingface.co",

  // Reasoning levels for GPT-OSS
  reasoningLevels: {
    low: "Reasoning: low - Provide quick, concise responses.",
    medium: "Reasoning: medium - Balance speed with detail and accuracy.",
    high: "Reasoning: high - Provide thorough, detailed analysis with step-by-step reasoning.",
  },

  // Default parameters
  defaultParams: {
    maxTokens: 1000,
    temperature: 0.7,
    topP: 0.9,
  },
}

export type ReasoningLevel = keyof typeof HUGGINGFACE_CONFIG.reasoningLevels
export type ModelSize = keyof typeof HUGGINGFACE_CONFIG.models.textGeneration
