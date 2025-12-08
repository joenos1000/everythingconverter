import { NextRequest } from "next/server";
import { createChatCompletion, type ChatMessage } from "@/lib/server/openrouter";
import { detectCurrencyConversion, extractAmount, getCurrencyDisplayName } from "@/lib/currency";
import { convertCurrency } from "@/lib/server/exchange-rates";

export const runtime = "edge";

// Model pricing (per 1M tokens)
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  "openai/gpt-4o": { input: 2.5, output: 10.0 },
  "openai/gpt-4o-mini": { input: 0.15, output: 0.6 },
  "openai/gpt-4-turbo": { input: 10.0, output: 30.0 },
  "openai/gpt-4": { input: 30.0, output: 60.0 },
  "openai/gpt-3.5-turbo": { input: 0.5, output: 1.5 },
  "anthropic/claude-3.5-sonnet": { input: 3.0, output: 15.0 },
  "anthropic/claude-3-opus": { input: 15.0, output: 75.0 },
  "anthropic/claude-3-sonnet": { input: 3.0, output: 15.0 },
  "anthropic/claude-3-haiku": { input: 0.25, output: 1.25 },
  "google/gemini-pro": { input: 0.5, output: 1.5 },
  "meta-llama/llama-3.1-70b-instruct": { input: 0.35, output: 0.4 },
  "meta-llama/llama-3.1-405b-instruct": { input: 2.5, output: 2.5 },
};

// Calculate cost estimate based on token usage
function calculateCost(usage: { prompt_tokens: number; completion_tokens: number } | undefined, model: string): number | null {
  if (!usage) return null;

  const pricing = MODEL_PRICING[model];
  if (!pricing) {
    // Default rough estimate if model not in our table
    return ((usage.prompt_tokens * 1.0 + usage.completion_tokens * 3.0) / 1_000_000);
  }

  return (usage.prompt_tokens * pricing.input + usage.completion_tokens * pricing.output) / 1_000_000;
}

// Calculate estimated water usage (data center cooling)
// Research suggests ~0.5-2 liters per 1000 tokens, we'll use 1 liter
function calculateWaterUsage(totalTokens: number | undefined): number | null {
  if (!totalTokens) return null;
  return (totalTokens / 1000) * 1.0; // liters
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const messages = (body?.messages || []) as ChatMessage[];
    const model = typeof body?.model === "string" && body.model.trim().length > 0 ? body.model.trim() : undefined;
    const temperature = typeof body?.temperature === "number" ? body.temperature : undefined;
    const topP = typeof body?.topP === "number" ? body.topP : undefined;
    const maxTokens = typeof body?.maxTokens === "number" ? body.maxTokens : undefined;
    const stream = Boolean(body?.stream);
    const from = typeof body?.from === "string" ? body.from : undefined;
    const to = typeof body?.to === "string" ? body.to : undefined;
    const skipValidation = Boolean(body?.skipValidation);

    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "messages[] is required" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }

    // Detect currency conversion and fetch real exchange rates
    let currencyData: string | null = null;
    let currencyInfo: { from: string; to: string; rate: number; amount: number } | null = null;
    if (from && to) {
      const currencyConversion = detectCurrencyConversion(from, to);

      if (currencyConversion) {
        try {
          const amount = extractAmount(from);
          const exchangeResult = await convertCurrency(
            amount,
            currencyConversion.from,
            currencyConversion.to
          );

          // Store currency info for stats
          currencyInfo = {
            from: currencyConversion.from,
            to: currencyConversion.to,
            rate: exchangeResult.rate,
            amount: amount,
          };

          const fromName = getCurrencyDisplayName(currencyConversion.from);
          const toName = getCurrencyDisplayName(currencyConversion.to);
          const rateDate = new Date(exchangeResult.timestamp).toLocaleString();

          // Format the result with appropriate precision
          const formatCurrency = (value: number) => {
            if (value >= 1000) return value.toFixed(2);
            if (value >= 1) return value.toFixed(2);
            if (value >= 0.01) return value.toFixed(4);
            return value.toFixed(8);
          };

          const formattedResult = formatCurrency(exchangeResult.convertedAmount);

          currencyData = `
CRITICAL CURRENCY CONVERSION DIRECTIVE:
This is a currency conversion request. The conversion has ALREADY been calculated using real-time exchange rates from the Open Exchange Rates API.

CONVERSION DETAILS:
- Input: ${amount} ${fromName} (${currencyConversion.from})
- Output: ${toName} (${currencyConversion.to})
- Exchange Rate: 1 ${currencyConversion.from} = ${exchangeResult.rate.toFixed(6)} ${currencyConversion.to}
- PRE-CALCULATED RESULT: ${formattedResult} ${currencyConversion.to}
- Rate Last Updated: ${rateDate}

MANDATORY INSTRUCTIONS:
1. You MUST use the PRE-CALCULATED RESULT shown above as your final answer
2. DO NOT recalculate or modify this value in any way
3. DO NOT use outdated exchange rates or estimates
4. Your result field MUST be exactly: "${formattedResult} ${currencyConversion.to}"
5. Your explanation should mention that you used the current exchange rate of ${exchangeResult.rate.toFixed(6)}

This is authoritative, real-time financial data. Accuracy is critical.
`;

          // Prepend currency data to the system message or add it as a new message
          const systemMessageIndex = messages.findIndex(msg => msg.role === 'system');
          if (systemMessageIndex !== -1) {
            messages[systemMessageIndex].content = currencyData + '\n' + messages[systemMessageIndex].content;
          } else {
            messages.unshift({
              role: 'system',
              content: currencyData,
            });
          }
        } catch (error) {
          console.error('Failed to fetch exchange rates:', error);
          // Continue without exchange rate data if fetch fails
        }
      }
    }

    // No deterministic path: we rely fully on the model

    // Start timing for stats
    const startTime = performance.now();

    if (stream) {
      const streamResponse = await createChatCompletion({ model, messages, temperature, topP, maxTokens, stream: true });

      const encoder = new TextEncoder();
      const readable = new ReadableStream<Uint8Array>({
        async start(controller) {
          try {
            for await (const chunk of streamResponse) {
              const choice = chunk?.choices?.[0];
              const delta = choice?.delta?.content ?? "";
              if (delta) controller.enqueue(encoder.encode(delta));
            }
          } catch (err) {
            controller.error(err);
          } finally {
            controller.close();
          }
        },
      });

      return new Response(readable, {
        headers: {
          "content-type": "text/plain; charset=utf-8",
          "cache-control": "no-store",
        },
      });
    }

    const nonStreamResponse = await createChatCompletion({ model, messages, temperature, topP, maxTokens, stream: false });
    let content = nonStreamResponse.choices?.[0]?.message?.content ?? "";

    // Second-pass validator to correct inconsistencies
    if (!skipValidation) {
      const validatorMessages: ChatMessage[] = [
        {
          role: "system",
          content:
            "You are a strict conversion validator. Ensure the result is numerically and dimensionally consistent with the quantities. If contradictions exist, correct them. Return ONLY JSON {\"result\": string, \"explanation\": string}.",
        },
        {
          role: "user",
          content: `From: ${from ?? ""}\nTo: ${to ?? ""}\nProposed: ${content}`,
        },
      ];

      try {
        const validator = await createChatCompletion({ model, messages: validatorMessages, temperature: 0, topP: 0.1, maxTokens: 300, stream: false });
        const corrected = validator.choices?.[0]?.message?.content ?? "";
        if (corrected && corrected.trim().length > 0) {
          content = corrected;
        }
      } catch {
        // If validator fails, fall back to original content
      }
    }

    // Calculate conversion time
    const endTime = performance.now();
    const conversionTimeMs = endTime - startTime;

    // Get the effective model used
    const effectiveModel = model || nonStreamResponse.model || "openai/gpt-5.1-chat";

    // Extract token usage
    const usage = nonStreamResponse.usage;

    // Stats for nerds
    const stats = {
      conversionTime: conversionTimeMs / 1000, // Convert to seconds with full precision
      model: effectiveModel,
      timestamp: new Date().toISOString(),
      // Token usage
      usage: usage ? {
        promptTokens: usage.prompt_tokens,
        completionTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens,
      } : null,
      // Cost estimate
      estimatedCost: calculateCost(usage, effectiveModel),
      // Water usage estimate
      estimatedWaterUsage: calculateWaterUsage(usage?.total_tokens),
      // Currency info (only when currency conversion was used)
      currencyInfo: currencyInfo,
    };

    return new Response(JSON.stringify({ content, model: nonStreamResponse.model, raw: nonStreamResponse, stats }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}


