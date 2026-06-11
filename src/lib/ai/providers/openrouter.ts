import type {
  AIGenerateTextInput,
  AIGenerateTextResult,
  AIProvider,
} from "../types";

export class OpenRouterProvider implements AIProvider {
  readonly name = "openrouter";

  async generateText(
    input: AIGenerateTextInput,
  ): Promise<AIGenerateTextResult> {
    void input;

    throw new Error(
      "OpenRouterProvider is a placeholder and is not configured yet.",
    );
  }
}
