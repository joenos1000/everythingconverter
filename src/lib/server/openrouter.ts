import OpenAI from "openai";
import type { Stream } from "openai/streaming";
import type {
  ChatCompletion,
  ChatCompletionChunk,
  ChatCompletionMessageParam,
} from "openai/resources/chat/completions";

// Create a configured OpenAI client that points to OpenRouter
export function createOpenRouterClient() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENROUTER_API_KEY. Set it in your environment.");
  }

  const client = new OpenAI({
    apiKey,
    baseURL: process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1",
    defaultHeaders: {
      "HTTP-Referer": process.env.OPENROUTER_REFERRER || "",
      "X-Title": process.env.OPENROUTER_SITE_NAME || "my-website",
    },
  });

  return client;
}

// Re-export the SDK's message type under a friendlier alias for use across the app
export type ChatMessage = ChatCompletionMessageParam;

export async function createChatCompletion(params: {
  model?: string;
  messages: ChatMessage[];
  temperature?: number;
  topP?: number;
  maxTokens?: number;
  stream: true;
}): Promise<Stream<ChatCompletionChunk>>;
export async function createChatCompletion(params: {
  model?: string;
  messages: ChatMessage[];
  temperature?: number;
  topP?: number;
  maxTokens?: number;
  stream?: false;
}): Promise<ChatCompletion>;
export async function createChatCompletion(params: {
  model?: string;
  messages: ChatMessage[];
  temperature?: number;
  topP?: number;
  maxTokens?: number;
  stream?: boolean;
}) {
  const client = createOpenRouterClient();
  const {
    model: requestedModel,
    messages,
    temperature = 0.7,
    topP,
    maxTokens,
    stream = false,
  } = params;

  const defaultModel = process.env.OPENROUTER_MODEL || "openai/gpt-5";
  const isPlaceholderModel = (m?: string) => {
    if (!m) return true;
    const v = m.trim().toLowerCase();
    if (!v) return true;
    return (
      v.includes("placeholder") ||
      v === "model" ||
      v === "model_id" ||
      v === "choose-a-model" ||
      v === "select-a-model" ||
      v === "openrouter/auto"
    );
  };

  const effectiveModel = isPlaceholderModel(requestedModel) ? defaultModel : requestedModel!;

  if (stream) {
    const response = await client.chat.completions.create({
      model: effectiveModel,
      messages,
      temperature,
      top_p: topP,
      max_tokens: maxTokens,
      response_format: { type: "json_object" },
      stream: true,
    });
    return response; // caller handles the stream
  }

  const response = await client.chat.completions.create({
    model: effectiveModel,
    messages,
    temperature,
    top_p: topP,
    max_tokens: maxTokens,
    response_format: { type: "json_object" },
    stream: false,
  });

  return response;
}


