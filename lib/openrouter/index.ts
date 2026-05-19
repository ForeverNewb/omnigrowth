// OpenRouter client stub. Real implementation comes after the dummy auth replacement.
// All OpenRouter (LLM + TTS) calls flow through here so they can be metered through
// the OmniBits wrapper.

export type OpenRouterModel =
  | "anthropic/claude-sonnet-4-6"
  | "openai/gpt-4o"
  | "google/gemini-2.5-pro"
  | "meta-llama/llama-3.3"
  | "mistralai/mistral-large";

export type GenerateOptions = {
  model: OpenRouterModel;
  prompt: string;
  maxTokens?: number;
  temperature?: number;
};

export async function generate(_opts: GenerateOptions): Promise<string> {
  throw new Error("OpenRouter client not implemented yet — v1 stub.");
}
