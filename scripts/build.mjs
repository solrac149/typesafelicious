import { build } from "vite";
import { cp, mkdir, rm } from "node:fs/promises";

await rm("dist", { recursive: true, force: true });
await build({ build: { outDir: "dist/client" } });
await build({
  configFile: false,
  ssr: { target: "webworker", noExternal: true },
  build: {
    ssr: "worker.ts",
    outDir: "dist/server",
    rollupOptions: { output: { entryFileNames: "index.js" } },
  },
});
await mkdir("dist/.openai", { recursive: true });
await cp(".openai/hosting.json", "dist/.openai/hosting.json");
