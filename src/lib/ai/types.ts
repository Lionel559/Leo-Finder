export type AIProviderName = "qwen" | "gemini" | "openrouter";

export type AIMessageRole = "system" | "user" | "assistant";

export type AIMessage = {
  role: AIMessageRole;
  content: string;
};

export type AIGenerateTextInput = {
  messages: AIMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
};

export type AIGenerateTextResult = {
  provider: AIProviderName;
  model: string;
  text: string;
  raw?: unknown;
};

export interface AIProvider {
  readonly name: AIProviderName;
  generateText(input: AIGenerateTextInput): Promise<AIGenerateTextResult>;
}
