import { classify } from "./api";

type Environment = {
  TYPESAFE_API_KEY?: string;
  ASSETS: { fetch(request: Request): Promise<Response> };
};

const json = (data: unknown, status = 200) => Response.json(data, {
  status, headers: { "Cache-Control": "no-store" },
});

export default {
  async fetch(request: Request, env: Environment): Promise<Response> {
    const url = new URL(request.url);
    if (!url.pathname.startsWith("/api/")) return env.ASSETS.fetch(request);
    if (url.pathname === "/api/health" && request.method === "GET") {
      return json({ configured: Boolean(env.TYPESAFE_API_KEY?.trim()) });
    }
    if (url.pathname !== "/api/classify") return json({ error: "Not found." }, 404);
    if (request.method !== "POST") return json({ error: "POST required." }, 405);
    const origin = request.headers.get("Origin");
    if ((origin && origin !== url.origin) || request.headers.get("Sec-Fetch-Site") === "cross-site") {
      return json({ error: "Cross-origin requests are not allowed." }, 403);
    }
    if (request.headers.get("Content-Type")?.split(";")[0].trim() !== "application/json") {
      return json({ error: "JSON required." }, 415);
    }

    // Bound streamed bodies as well as requests with Content-Length.
    const reader = request.body?.getReader();
    if (!reader) return json({ error: "Request body required." }, 400);
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 32 * 1024) {
          await reader.cancel();
          return json({ error: "Request body too large." }, 413);
        }
        chunks.push(value);
      }
    } catch {
      return json({ error: "Could not read request." }, 400);
    } finally {
      reader.releaseLock();
    }
    let body: { text?: unknown } | null;
    try {
      body = JSON.parse(await new Blob(chunks as BlobPart[]).text());
    } catch {
      return json({ error: "Invalid JSON." }, 400);
    }
    const text = typeof body?.text === "string" ? body.text.trim() : "";
    if (!text || text.length > 8_000) {
      return json({ error: "Text must contain between 1 and 8,000 characters." }, 400);
    }
    if (!env.TYPESAFE_API_KEY?.trim()) {
      return json({ error: "TYPESAFE_API_KEY is not configured." }, 503);
    }
    try {
      return json(await classify(text, env.TYPESAFE_API_KEY, request.signal));
    } catch {
      return json({ error: "Jev could not classify this signal." }, 502);
    }
  },
};
