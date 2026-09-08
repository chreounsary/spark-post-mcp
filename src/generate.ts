import { GoogleGenAI } from "@google/genai";
import type { Env, Platform, PostDraft } from "./types";

/**
 * Overridable via the GEMINI_MODEL var in wrangler.jsonc, so a model
 * deprecation is a config change rather than a code change.
 */
const DEFAULT_MODEL = "gemini-3.6-flash";

const PLATFORM_GUIDANCE: Record<Platform, string> = {
  LinkedIn: "Professional tone, 1-3 short paragraphs, a clear takeaway, no more than 5 hashtags.",
  X: "Punchy and under 280 characters including hashtags. At most 3 hashtags.",
  Bluesky: "Conversational and under 300 characters. Skip corporate voice. At most 3 hashtags.",
};

export async function generateDraft(
  env: Env,
  topic: string,
  platform: Platform
): Promise<PostDraft> {
  if (!env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  const response = await ai.models.generateContent({
    model: env.GEMINI_MODEL?.trim() || DEFAULT_MODEL,
    contents: `Create a post about "${topic}". Optimize strictly for ${platform}. ${PLATFORM_GUIDANCE[platform]}`,
    config: {
      systemInstruction: "You are an expert social media copywriter.",
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: {
          platform: { type: "STRING" },
          headline: { type: "STRING" },
          content: { type: "STRING" },
          hashtags: { type: "ARRAY", items: { type: "STRING" } },
        },
        required: ["platform", "headline", "content", "hashtags"],
      },
    },
  });

  let parsed: Partial<PostDraft>;
  try {
    parsed = JSON.parse(response.text ?? "{}");
  } catch {
    throw new Error("Gemini returned copy that was not valid JSON.");
  }

  if (!parsed.headline || !parsed.content) {
    throw new Error("Gemini returned an incomplete draft (missing headline or content).");
  }

  return {
    // Trust the requested platform over the model's echo of it, so the value
    // always satisfies the `posts.platform` check constraint.
    platform,
    headline: parsed.headline,
    content: parsed.content,
    hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags.filter(Boolean) : [],
  };
}
