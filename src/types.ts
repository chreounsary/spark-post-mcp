export type Platform = "LinkedIn" | "X" | "Bluesky";

export const PLATFORMS: Platform[] = ["LinkedIn", "X", "Bluesky"];

export function isPlatform(value: unknown): value is Platform {
  return typeof value === "string" && (PLATFORMS as string[]).includes(value);
}

export interface Env {
  GEMINI_API_KEY: string;
  /** Optional; falls back to the default model in generate.ts. */
  GEMINI_MODEL?: string;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_KEY: string;
}

/** Where a post was created from. */
export type PostSource = "mcp" | "dashboard";

/** The generated copy, as returned by Gemini. */
export interface PostDraft {
  platform: Platform;
  headline: string;
  content: string;
  hashtags: string[];
}

/** A draft persisted in the Supabase `posts` table. */
export interface PostRecord extends PostDraft {
  id: string;
  topic: string;
  source: PostSource;
  created_at: string;
}
