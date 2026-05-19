import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { chatComplete, OpenRouterError, type ChatMessage } from "@/lib/openrouter";
import type { TraceContext } from "@/lib/openrouter/trace";
import { renderChannelRules, type Channel } from "./channels";
import { modelChainsByMedia } from "./config";

const AGENT_DIR = join(process.cwd(), "agents", "post-writer");

let cachedSystemPrompt: string | undefined;

async function getSystemPrompt(): Promise<string> {
  if (cachedSystemPrompt) return cachedSystemPrompt;
  cachedSystemPrompt = await readFile(join(AGENT_DIR, "system-prompt.md"), "utf-8");
  return cachedSystemPrompt;
}

export type AgentBrand = {
  name: string;
  voice: string;
  description: string;
};

export type AgentTone = "warm" | "dry" | "bold";

export type AgentInput = {
  brand: AgentBrand;
  brief: string;
  channel: Channel;
  tone: AgentTone;
  apiKey: string;
  traceContext?: TraceContext;
};

export type AgentResult = {
  text: string;
  modelUsed: string;
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
  latencyMs: number;
};

export class AgentError extends Error {
  constructor(
    public code: "GEN_FAILED" | "GEN_REFUSED" | "GEN_BAD_INPUT",
    message: string,
    public retryable: boolean,
  ) {
    super(message);
    this.name = code;
  }
}

function renderBrandVoice(brand: AgentBrand): string {
  return brand.voice
    ? `${brand.voice}\n\nWhat the brand does: ${brand.description}`
    : brand.description;
}

export async function invoke(input: AgentInput): Promise<AgentResult> {
  const template = await getSystemPrompt();
  const systemContent = template
    .replace("{{brand_voice}}", renderBrandVoice(input.brand))
    .replace("{{channel_rules}}", renderChannelRules(input.channel))
    .replace("{{tone}}", input.tone);

  const messages: ChatMessage[] = [
    { role: "system", content: systemContent },
    { role: "user", content: input.brief },
  ];

  try {
    const result = await chatComplete({
      apiKey: input.apiKey,
      modelChain: [...modelChainsByMedia.text],
      messages,
      traceContext: input.traceContext,
    });

    if (result.refused) {
      throw new AgentError("GEN_REFUSED", "Model declined the request", false);
    }

    return {
      text: result.content,
      modelUsed: result.modelUsed,
      tokensIn: result.tokensIn,
      tokensOut: result.tokensOut,
      costUsd: result.costUsd,
      latencyMs: result.latencyMs,
    };
  } catch (err) {
    if (err instanceof AgentError) throw err;
    if (err instanceof OpenRouterError) {
      if (err.code === "OPENROUTER_BAD_REQUEST") {
        throw new AgentError("GEN_BAD_INPUT", err.message, false);
      }
      if (err.code === "OPENROUTER_CHAIN_EXHAUSTED") {
        throw new AgentError("GEN_FAILED", err.message, true);
      }
    }
    throw err;
  }
}
