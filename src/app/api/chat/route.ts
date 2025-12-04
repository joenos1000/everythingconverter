import { NextRequest } from "next/server";
import { createChatCompletion, type ChatMessage } from "@/lib/server/openrouter";
import { detectCurrencyConversion, extractAmount, getCurrencyDisplayName } from "@/lib/currency";
import { convertCurrency } from "@/lib/server/exchange-rates";

export const runtime = "edge";

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

          const fromName = getCurrencyDisplayName(currencyConversion.from);
          const toName = getCurrencyDisplayName(currencyConversion.to);
          const rateDate = new Date(exchangeResult.timestamp).toLocaleString();

          currencyData = `
IMPORTANT: ACTUAL LIVE EXCHANGE RATE DATA (Use this authoritative data for the conversion):
- Source: ${amount} ${fromName} (${currencyConversion.from})
- Target: ${toName} (${currencyConversion.to})
- Current Exchange Rate: 1 ${currencyConversion.from} = ${exchangeResult.rate.toFixed(6)} ${currencyConversion.to}
- Converted Amount: ${exchangeResult.convertedAmount.toFixed(2)} ${currencyConversion.to}
- Rate Updated: ${rateDate}
- Base Currency: ${exchangeResult.base}

You MUST use this actual exchange rate data for the conversion. This is real, current data from Open Exchange Rates API.
Do NOT make up or estimate exchange rates. Use the provided rate: ${exchangeResult.rate.toFixed(6)}
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

    return new Response(JSON.stringify({ content, model: nonStreamResponse.model, raw: nonStreamResponse }), {
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


