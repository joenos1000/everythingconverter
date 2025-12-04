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

    const systemPrompt = `You are a conversion suggestion assistant. Given what the user wants to convert FROM, suggest 3 creative and useful things they might want to convert TO.

Rules:
1. Provide exactly 3 suggestions
2. Make suggestions relevant and creative
3. Consider different types of conversions: units, currencies, measurements, time zones, etc.
4. Keep suggestions concise (2-5 words each)
5. Return ONLY valid JSON with a "suggestions" array containing 3 strings
6. Example format: {"suggestions": ["meters", "football fields", "light years"]}

Do not include explanations, just the JSON object with suggestions array.`;

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
