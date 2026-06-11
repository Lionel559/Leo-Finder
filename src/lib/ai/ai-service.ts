import { requireEnvVar } from "@/lib/security";

import { GeminiProvider, OpenRouterProvider, QwenProvider } from "./providers";
import type {
  AIGenerateTextInput,
  AIGenerateTextResult,
  AIProvider,
  AIProviderName,
} from "./types";

type AIMatchExplanationInput = {
  opportunity: {
    title: string;
    organization: string;
    category: string;
    skills: string[];
  };
  match: {
    overallScore: number;
    reasons: string[];
    missingSkills: string[];
  };
};

export class AIService {
  private readonly provider: AIProvider;

  constructor(provider: AIProvider = AIService.createProvider("qwen")) {
    this.provider = provider;
  }

  static createProvider(providerName: AIProviderName): AIProvider {
    switch (providerName) {
      case "qwen":
        return new QwenProvider({ apiKey: requireEnvVar("QWEN_API_KEY") });
      case "gemini":
        return new GeminiProvider();
      case "openrouter":
        return new OpenRouterProvider();
    }
  }

  get providerName() {
    return this.provider.name;
  }

  generateText(input: AIGenerateTextInput): Promise<AIGenerateTextResult> {
    return this.provider.generateText(input);
  }

  generateMatchExplanation(
    input: AIMatchExplanationInput,
  ): Promise<AIGenerateTextResult> {
    return this.generateText({
      maxTokens: 160,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "You explain opportunity matches for Leo Finder in concise, practical language.",
        },
        {
          role: "user",
          content: JSON.stringify(input),
        },
      ],
    });
  }
}

export function createAIService(providerName: AIProviderName = "qwen") {
  return new AIService(AIService.createProvider(providerName));
}
