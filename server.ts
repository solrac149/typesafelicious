import "dotenv/config";

import { classify } from "./api";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

const app = express();
const port = Number(process.env.PORT ?? 3001);
const hasApiKey = Boolean(process.env.TYPESAFE_API_KEY?.trim());


app.use(express.json({ limit: "32kb" }));

app.get("/api/health", (_request, response) => {
  response.json({ configured: hasApiKey });
});

app.post("/api/classify", async (request, response) => {
  const text = typeof request.body?.text === "string" ? request.body.text.trim() : "";

  if (!text || text.length > 8_000) {
    response.status(400).json({ error: "Text must contain between 1 and 8,000 characters." });
    return;
  }

  if (!hasApiKey) {
    response.status(503).json({ error: "TYPESAFE_API_KEY is not configured." });
    return;
  }

  const controller = new AbortController();
  const onClose = () => { if (!response.writableEnded) controller.abort(); };
  response.on("close", onClose);
  try {
    response.setHeader("Cache-Control", "no-store");
    response.json(await classify(text, process.env.TYPESAFE_API_KEY!, controller.signal));
  } catch {
    if (!controller.signal.aborted) {
      response.status(502).json({ error: "Jev could not classify this signal." });
    }
  } finally {
    response.off("close", onClose);
  }
});

if (process.env.NODE_ENV === "production") {
  const directory = path.dirname(fileURLToPath(import.meta.url));
  app.use(express.static(path.join(directory, "dist/client")));
  app.use((_request, response) => {
    response.sendFile(path.join(directory, "dist/client", "index.html"));
  });
}

app.listen(port, () => {
  console.log(`Jev Signal API listening on http://localhost:${port}`);
});
