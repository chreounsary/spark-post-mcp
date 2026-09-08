import { DASHBOARD_HTML } from "./dashboard";
import { generateDraft } from "./generate";
import {
  deletePost,
  isSupabaseConfigured,
  listPosts,
  probeConnection,
  savePost,
} from "./supabase";
import { isPlatform, PLATFORMS, type Env, type Platform } from "./types";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "*",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

// 1. Tool definitions conforming to MCP JSON-RPC spec
const TOOLS = [
  {
    name: "generate_post_draft",
    description:
      "Generates structured social media post copy for a topic and saves it to Supabase.",
    inputSchema: {
      type: "object",
      properties: {
        topic: {
          type: "string",
          description: "The topic, launch, or announcement details.",
        },
        platform: {
          type: "string",
          enum: PLATFORMS,
          description: "Target social media platform.",
        },
      },
      required: ["topic", "platform"],
    },
  },
  {
    name: "list_saved_posts",
    description: "Lists post drafts previously saved to Supabase, newest first.",
    inputSchema: {
      type: "object",
      properties: {
        platform: {
          type: "string",
          enum: PLATFORMS,
          description: "Optional filter for a single platform.",
        },
        limit: {
          type: "number",
          description: "Maximum number of posts to return (default 20, max 200).",
        },
      },
    },
  },
];

async function callTool(name: string, args: Record<string, unknown> | undefined, env: Env) {
  if (name === "generate_post_draft") {
    const topic = args?.topic;
    const platform = args?.platform;

    if (typeof topic !== "string" || !topic.trim()) {
      throw new Error("`topic` is required.");
    }
    if (!isPlatform(platform)) {
      throw new Error(`\`platform\` must be one of: ${PLATFORMS.join(", ")}.`);
    }

    const draft = await generateDraft(env, topic, platform);
    const post = await savePost(env, topic, draft, "mcp");
    return post;
  }

  if (name === "list_saved_posts") {
    const platform = args?.platform;
    const limit = args?.limit;

    if (platform !== undefined && !isPlatform(platform)) {
      throw new Error(`\`platform\` must be one of: ${PLATFORMS.join(", ")}.`);
    }

    return listPosts(env, {
      platform: isPlatform(platform) ? platform : undefined,
      limit: typeof limit === "number" ? limit : 20,
    });
  }

  return undefined;
}

// Helper to handle JSON-RPC requests
async function handleRpcMessage(message: any, env: Env) {
  const { id, method, params } = message;

  // Step A: Handshake negotiation
  if (method === "initialize") {
    return {
      jsonrpc: "2.0",
      id,
      result: {
        protocolVersion: "2024-11-05",
        capabilities: {
          tools: {},
        },
        serverInfo: {
          name: "spark-post-mcp",
          version: "1.1.0",
        },
      },
    };
  }

  // Step B: Client acknowledgment notification
  if (method === "notifications/initialized") {
    return null; // Notifications do not return responses
  }

  // Step C: List available tools
  if (method === "tools/list") {
    return {
      jsonrpc: "2.0",
      id,
      result: {
        tools: TOOLS,
      },
    };
  }

  // Step D: Execute tool via Google GenAI SDK, persisting through Supabase
  if (method === "tools/call") {
    const { name, arguments: args } = params ?? {};

    try {
      const result = await callTool(name, args, env);
      if (result === undefined) {
        return {
          jsonrpc: "2.0",
          id,
          error: { code: -32601, message: `Unknown tool: ${name}` },
        };
      }

      return {
        jsonrpc: "2.0",
        id,
        result: {
          content: [{ type: "text", text: JSON.stringify(result) }],
        },
      };
    } catch (err) {
      return {
        jsonrpc: "2.0",
        id,
        error: { code: -32603, message: errorMessage(err) },
      };
    }
  }

  if (method === "ping") {
    return { jsonrpc: "2.0", id, result: {} };
  }

  return {
    jsonrpc: "2.0",
    id,
    error: { code: -32601, message: `Method not found: ${method}` },
  };
}

// Dashboard API: generate a draft and store it
async function apiGenerate(request: Request, env: Env): Promise<Response> {
  let body: { topic?: unknown; platform?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Request body must be JSON." }, 400);
  }

  const { topic, platform } = body;
  if (typeof topic !== "string" || !topic.trim()) {
    return json({ error: "A topic is required." }, 400);
  }
  if (!isPlatform(platform)) {
    return json({ error: `Platform must be one of: ${PLATFORMS.join(", ")}.` }, 400);
  }

  try {
    const draft = await generateDraft(env, topic.trim(), platform);
    const post = await savePost(env, topic.trim(), draft, "dashboard");
    return json({ post });
  } catch (err) {
    return json({ error: errorMessage(err) }, 502);
  }
}

// Dashboard API: read stored posts
async function apiListPosts(url: URL, env: Env): Promise<Response> {
  const requested = url.searchParams.get("platform");
  let platform: Platform | undefined;

  if (requested !== null) {
    if (!isPlatform(requested)) {
      return json({ error: `Platform must be one of: ${PLATFORMS.join(", ")}.` }, 400);
    }
    platform = requested;
  }

  try {
    const posts = await listPosts(env, { platform });
    return json({ posts });
  } catch (err) {
    return json({ error: errorMessage(err) }, 502);
  }
}

// Dashboard API: remove a stored post
async function apiDeletePost(id: string, env: Env): Promise<Response> {
  if (!id) {
    return json({ error: "A post id is required." }, 400);
  }

  try {
    await deletePost(env, id);
    return json({ deleted: id });
  } catch (err) {
    return json({ error: errorMessage(err) }, 502);
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const { pathname } = url;

    // Allow CORS headers for Gemini client requests
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }

    // Dashboard API, checked ahead of the catch-all JSON-RPC POST handler
    if (pathname === "/api/generate" && request.method === "POST") {
      return apiGenerate(request, env);
    }
    if (pathname === "/api/posts" && request.method === "GET") {
      return apiListPosts(url, env);
    }
    if (pathname.startsWith("/api/posts/") && request.method === "DELETE") {
      return apiDeletePost(decodeURIComponent(pathname.slice("/api/posts/".length)), env);
    }

    // Direct HTTP POST JSON-RPC endpoint
    if (request.method === "POST") {
      try {
        const body = await request.json();
        const response = await handleRpcMessage(body, env);
        if (!response) {
          return new Response(null, { status: 204, headers: CORS_HEADERS });
        }
        return json(response);
      } catch {
        return json({ jsonrpc: "2.0", error: { code: -32700, message: "Parse error" } }, 400);
      }
    }

    // SSE Endpoint
    if (pathname === "/sse" || pathname === "/mcp") {
      const endpointUri = `${url.origin}/`;
      const stream = new ReadableStream({
        start(controller) {
          const encoder = new TextEncoder();
          controller.enqueue(encoder.encode(`event: endpoint\ndata: ${endpointUri}\n\n`));
        },
      });

      return new Response(stream, {
        headers: {
          ...CORS_HEADERS,
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    // Machine-readable status check
    if (pathname === "/health") {
      const probe = isSupabaseConfigured(env) ? await probeConnection(env) : null;

      return json({
        status: "online",
        mcp: "JSON-RPC 2.0",
        tools: TOOLS.map((tool) => tool.name),
        gemini: env.GEMINI_API_KEY ? "configured" : "missing",
        supabase: !probe ? "missing" : probe.ok ? "connected" : "error",
        supabaseKey: probe?.key,
        supabaseError: probe?.error,
      });
    }

    // Platform display
    if (pathname === "/") {
      return new Response(DASHBOARD_HTML, {
        headers: { ...CORS_HEADERS, "Content-Type": "text/html; charset=utf-8" },
      });
    }

    return json({ error: `Not found: ${pathname}` }, 404);
  },
};
