import OpenAI from "openai";

export type OpenRouterClientOpts = {
  apiKey: string;
  /** Sent as HTTP-Referer; OpenRouter uses this for the rankings page. Optional. */
  referrer?: string;
  /** Sent as X-Title; appears in OpenRouter's dashboard. Optional. */
  appTitle?: string;
};

export function createOpenRouterClient(opts: OpenRouterClientOpts): OpenAI {
  const defaultHeaders: Record<string, string> = {};
  if (opts.referrer) defaultHeaders["HTTP-Referer"] = opts.referrer;
  if (opts.appTitle) defaultHeaders["X-Title"] = opts.appTitle;
  return new OpenAI({
    apiKey: opts.apiKey,
    baseURL: "https://openrouter.ai/api/v1",
    defaultHeaders,
  });
}
