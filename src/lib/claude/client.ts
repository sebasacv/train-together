import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export { anthropic };

export async function generateWithClaude<T>(
  systemPrompt: string,
  userMessage: string,
  options?: {
    model?: string;
    maxTokens?: number;
  }
): Promise<T> {
  const response = await anthropic.messages.create({
    model: options?.model ?? "claude-sonnet-4-6",
    max_tokens: options?.maxTokens ?? 8192,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  });

  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text response from Claude");
  }

  // Extract JSON from the response (handles markdown code blocks and preamble)
  let jsonStr = textBlock.text.trim();

  // Try to extract from markdown code blocks
  const jsonMatch = jsonStr.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  }

  // If still not valid JSON, try to find the first { and last }
  if (!jsonStr.startsWith("{") && !jsonStr.startsWith("[")) {
    const firstBrace = jsonStr.indexOf("{");
    const lastBrace = jsonStr.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1) {
      jsonStr = jsonStr.slice(firstBrace, lastBrace + 1);
    }
  }

  return JSON.parse(jsonStr) as T;
}
