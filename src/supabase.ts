import type { Env, Platform, PostDraft, PostRecord, PostSource } from "./types";

const TABLE = "posts";

export function isSupabaseConfigured(env: Env): boolean {
  return Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_KEY);
}

/** Reads the `role` claim out of a legacy Supabase JWT. Claims only. */
function jwtRole(token: string): string | undefined {
  try {
    const payload = token.split(".")[1] ?? "";
    const base64 = payload
      .replace(/-/g, "+")
      .replace(/_/g, "/")
      .padEnd(Math.ceil(payload.length / 4) * 4, "=");
    return (JSON.parse(atob(base64)) as { role?: string }).role;
  } catch {
    return undefined;
  }
}

/**
 * Classifies a key by format. `posts` has RLS on with no policies, so an
 * unprivileged key reads an empty list and fails every write — a confusing
 * failure we would rather catch up front. Unrecognized formats are allowed
 * through, so a future key style is Supabase's call to accept or reject.
 */
export function describeKey(key: string): { privileged: boolean; label: string } {
  if (key.startsWith("sb_secret_")) return { privileged: true, label: "secret key" };
  if (key.startsWith("sb_publishable_")) return { privileged: false, label: "publishable key" };

  if (key.startsWith("eyJ")) {
    const role = jwtRole(key);
    return { privileged: role === "service_role", label: `legacy ${role ?? "unknown"} key` };
  }

  return { privileged: true, label: "unrecognized key format" };
}

/**
 * Reads the service key, tolerating a stray newline from a piped `secret put`
 * and rejecting values that plainly cannot work — a pasted shell command, or a
 * publishable key — which otherwise surface only as an opaque 401 or 42501.
 */
function serviceKey(env: Env): string {
  const key = (env.SUPABASE_SERVICE_KEY ?? "").trim();

  if (!key) {
    throw new Error(
      "Supabase is not configured. Set the SUPABASE_URL and SUPABASE_SERVICE_KEY secrets."
    );
  }
  if (/\s/.test(key)) {
    throw new Error(
      "SUPABASE_SERVICE_KEY contains whitespace, so it is not a valid key. Re-run " +
        "`npx wrangler secret put SUPABASE_SERVICE_KEY` and paste only the key at the prompt."
    );
  }

  const { privileged, label } = describeKey(key);
  if (!privileged) {
    throw new Error(
      `SUPABASE_SERVICE_KEY holds a ${label}, which row-level security blocks from reading ` +
        "or writing `posts`. Use the service_role key (or an sb_secret_... key) instead."
    );
  }

  return key;
}

/**
 * Calls the Supabase REST (PostgREST) API with the service role key. The key
 * bypasses RLS, so this must only ever run server-side inside the Worker.
 */
async function rest(env: Env, path: string, init: RequestInit = {}): Promise<Response> {
  const key = serviceKey(env);
  const baseUrl = (env.SUPABASE_URL ?? "").trim().replace(/\/+$/, "");

  if (!baseUrl) {
    throw new Error("SUPABASE_URL is not set.");
  }

  const response = await fetch(`${baseUrl}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`Supabase responded ${response.status}: ${await response.text()}`);
  }

  return response;
}

export async function savePost(
  env: Env,
  topic: string,
  draft: PostDraft,
  source: PostSource
): Promise<PostRecord> {
  const response = await rest(env, TABLE, {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      topic,
      platform: draft.platform,
      headline: draft.headline,
      content: draft.content,
      hashtags: draft.hashtags,
      source,
    }),
  });

  const [row] = (await response.json()) as PostRecord[];
  return row;
}

export async function listPosts(
  env: Env,
  options: { platform?: Platform; limit?: number } = {}
): Promise<PostRecord[]> {
  const params = new URLSearchParams({
    select: "*",
    order: "created_at.desc",
    limit: String(Math.min(options.limit ?? 50, 200)),
  });

  if (options.platform) {
    params.set("platform", `eq.${options.platform}`);
  }

  const response = await rest(env, `${TABLE}?${params}`);
  return (await response.json()) as PostRecord[];
}

export async function deletePost(env: Env, id: string): Promise<void> {
  await rest(env, `${TABLE}?id=eq.${encodeURIComponent(id)}`, { method: "DELETE" });
}

/**
 * Lightweight connectivity check for `/health`. Reports the key type alongside
 * the result: a SELECT under locked-down RLS returns an empty 200 even for a
 * key with no access, so reachability alone does not prove the key is usable.
 */
export async function probeConnection(
  env: Env
): Promise<{ ok: boolean; key: string; error?: string }> {
  const key = describeKey((env.SUPABASE_SERVICE_KEY ?? "").trim());

  try {
    await rest(env, `${TABLE}?select=id&limit=1`);
    return { ok: true, key: key.label };
  } catch (err) {
    return { ok: false, key: key.label, error: err instanceof Error ? err.message : String(err) };
  }
}
