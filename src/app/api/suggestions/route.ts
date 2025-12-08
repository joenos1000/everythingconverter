import { NextRequest, NextResponse } from "next/server";
import { createOpenRouterClient } from "@/lib/server/openrouter";

export const runtime = "edge";

export async function POST(request: NextRequest) {
  try {
    const { fromText } = await request.json();

    if (!fromText || fromText.trim().length === 0) {
      return NextResponse.json(
        { error: "From text is required" },
        { status: 400 }
      );
    }

    const openai = createOpenRouterClient();

    const systemPrompt = `You are a conversion suggestion assistant. Your PRIMARY goal is to suggest conversion targets that make logical sense and are actually convertible. Secondary goal: make them quirky and fun when possible.

CRITICAL RULE - CONVERTIBILITY FIRST:
Every suggestion MUST have a clear, valid conversion path. Ask yourself: "Can I actually convert this using a shared measurable property?"
- If input is mass/weight → suggest things with measurable mass
- If input is length/distance → suggest things with measurable length
- If input is time → suggest time-based equivalents
- If input is volume → suggest volumetric comparisons
- If input is energy/calories → suggest energy equivalents
- If input is money → suggest things with monetary value

ONLY after ensuring convertibility, make it interesting:
- Use everyday objects, food items, animals, or iconic things as units (but ONLY if they have the right measurable property)
- Pop culture references are great IF they make sense for the conversion type
- Absurd scale differences are funny when the conversion is still valid

RED FLAGS (avoid these):
- Suggesting "height of X" when input is a weight/mass
- Suggesting random objects without considering what property they share with the input
- Being clever at the expense of conversion validity
- Including numbers, quantities, or doing the conversion (just suggest the UNIT/TARGET, not the answer)

IMPORTANT: Suggest only the TARGET UNIT, NOT the converted value.
Examples: "bananas" not "120,000 bananas", "elephants" not "30 adult elephants", "eiffel towers" not "10 eiffel towers"

CONCISE: 1-4 words per suggestion (just the unit name)

FORMAT:
Return ONLY valid JSON: {"suggestions": ["suggestion1", "suggestion2", "suggestion3"]}`;

    const completion = await openai.chat.completions.create({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: `What are 3 good conversion targets for: "${fromText}"`,
        },
      ],
      temperature: 0.7,
      max_tokens: 100,
      response_format: { type: "json_object" },
    });

    const responseContent = completion.choices[0]?.message?.content;
    if (!responseContent) {
      throw new Error("No response from AI");
    }

    // Parse the response - it should be a JSON object containing an array
    let suggestions: string[];
    try {
      const parsed = JSON.parse(responseContent);
      // Handle different possible response formats
      if (Array.isArray(parsed)) {
        suggestions = parsed.slice(0, 3);
      } else if (parsed.suggestions && Array.isArray(parsed.suggestions)) {
        suggestions = parsed.suggestions.slice(0, 3);
      } else {
        // If we get an object, try to extract values
        const values = Object.values(parsed);
        if (Array.isArray(values[0])) {
          suggestions = values[0].slice(0, 3);
        } else {
          suggestions = values.slice(0, 3).map(String);
        }
      }
    } catch (parseError) {
      console.error("Failed to parse suggestions:", parseError);
      return NextResponse.json(
        { error: "Invalid response format" },
        { status: 500 }
      );
    }

    // Ensure we have exactly 3 suggestions
    if (!suggestions || suggestions.length === 0) {
      return NextResponse.json(
        { error: "No suggestions generated" },
        { status: 500 }
      );
    }

    // Pad with generic suggestions if needed
    while (suggestions.length < 3) {
      suggestions.push("other units");
    }

    return NextResponse.json({ suggestions: suggestions.slice(0, 3) });
  } catch (error) {
    console.error("Error generating suggestions:", error);
    return NextResponse.json(
      { error: "Failed to generate suggestions" },
      { status: 500 }
    );
  }
}
