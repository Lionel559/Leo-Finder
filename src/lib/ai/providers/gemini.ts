import type {
  AIGenerateTextInput,
  AIGenerateTextResult,
  AIProvider,
} from "../types";

export class GeminiProvider implements AIProvider {
  readonly name = "gemini";

  async generateText(
    input: AIGenerateTextInput,
  ): Promise<AIGenerateTextResult> {
    void input;

    throw new Error("GeminiProvider is a placeholder and is not configured yet.");
  }
}
