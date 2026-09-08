import { SELF } from "cloudflare:test";
import { describe, it, expect } from "vitest";

describe("platform display", () => {
	it("serves the dashboard at the root", async () => {
		const response = await SELF.fetch("https://example.com/");

		expect(response.status).toBe(200);
		expect(response.headers.get("content-type")).toContain("text/html");
		expect(await response.text()).toContain("Spark Post");
	});

	it("reports configuration state at /health", async () => {
		const response = await SELF.fetch("https://example.com/health");

		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toMatchObject({
			status: "online",
			tools: ["generate_post_draft", "list_saved_posts"],
		});
	});
});

describe("mcp endpoint", () => {
	it("completes the initialize handshake", async () => {
		const response = await SELF.fetch("https://example.com/", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize" }),
		});

		await expect(response.json()).resolves.toMatchObject({
			id: 1,
			result: { serverInfo: { name: "spark-post-mcp" } },
		});
	});

	it("advertises both tools", async () => {
		const response = await SELF.fetch("https://example.com/", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list" }),
		});

		const body = (await response.json()) as { result: { tools: { name: string }[] } };
		expect(body.result.tools.map((tool) => tool.name)).toEqual([
			"generate_post_draft",
			"list_saved_posts",
		]);
	});

	it("rejects an unknown platform before calling Gemini", async () => {
		const response = await SELF.fetch("https://example.com/", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				jsonrpc: "2.0",
				id: 3,
				method: "tools/call",
				params: { name: "generate_post_draft", arguments: { topic: "hi", platform: "Threads" } },
			}),
		});

		const body = (await response.json()) as { error: { message: string } };
		expect(body.error.message).toContain("platform");
	});
});

describe("dashboard api", () => {
	it("validates the generate payload", async () => {
		const response = await SELF.fetch("https://example.com/api/generate", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ topic: "", platform: "X" }),
		});

		expect(response.status).toBe(400);
		await expect(response.json()).resolves.toMatchObject({ error: "A topic is required." });
	});
});
