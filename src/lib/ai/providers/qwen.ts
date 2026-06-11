import type {
  AIGenerateTextInput,
  AIGenerateTextResult,
  AIProvider,
} from "../types";

const DEFAULT_QWEN_BASE_URL =
  "https://dashscope.aliyuncs.com/compatible-mode/v1";
const DEFAULT_QWEN_MODEL = "qwen-plus";

type QwenProviderOptions = {
  apiKey: string;
  baseUrl?: string;
  model?: string;
};

type QwenChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  error?: {
    message?: string;
  };
};

export class QwenProvider implements AIProvider {
  readonly name = "qwen";

  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly model: string;

  constructor(options: QwenProviderOptions) {
    if (!options.apiKey) {
      throw new Error("QwenProvider requires QWEN_API_KEY.");
    }

    this.apiKey = options.apiKey;
    this.baseUrl = (options.baseUrl ?? DEFAULT_QWEN_BASE_URL).replace(/\/$/, "");
    this.model = options.model ?? DEFAULT_QWEN_MODEL;
  }

  async generateText(
    input: AIGenerateTextInput,
  ): Promise<AIGenerateTextResult> {
    const model = input.model ?? this.model;
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: input.messages,
        temperature: input.temperature,
        max_tokens: input.maxTokens,
      }),
    });
    const payload = (await response
      .json()
      .catch(() => null)) as QwenChatCompletionResponse | null;

    if (!response.ok) {
      throw new Error(
        payload?.error?.message ??
          `Qwen request failed with status ${response.status}`,
      );
    }

    return {
      provider: this.name,
      model,
      text: payload?.choices?.[0]?.message?.content ?? "",
      raw: payload ?? undefined,
    };
  }
}
