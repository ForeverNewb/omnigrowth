export type MediaType = "text" | "image" | "video";

export const OPENROUTER_TEXT_CHAIN = [
  "anthropic/claude-sonnet-4-6",
  "openai/gpt-5",
  "google/gemini-2.5-pro",
] as const;

export type OpenRouterTextModel = (typeof OPENROUTER_TEXT_CHAIN)[number];

export function getModelChain(media: MediaType): string[] {
  if (media !== "text") {
    throw new Error(
      `OPENROUTER_MEDIA_UNSUPPORTED: media='${media}' must go through lib/together or lib/wavespeed`,
    );
  }
  return [...OPENROUTER_TEXT_CHAIN];
}
