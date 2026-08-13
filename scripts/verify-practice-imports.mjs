import { build } from "esbuild";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const directory = await mkdtemp(join(process.cwd(), ".practice-import-tests-"));
try {
  await build({
    entryPoints: ["features/practice-work/services/document-extraction-service.test.ts", "features/practice-work/services/gemini-document-extraction-provider.test.ts"],
    outdir: directory,
    entryNames: "[name]",
    bundle: true,
    format: "cjs",
    platform: "node",
    target: "node22",
    external: ["mammoth", "pdf-parse", "pdf-lib", "jszip"],
    plugins: [{ name: "server-only", setup(builder) { builder.onResolve({ filter: /^server-only$/ }, () => ({ path: "server-only", namespace: "empty" })); builder.onLoad({ filter: /.*/, namespace: "empty" }, () => ({ contents: "export {};", loader: "js" })); } }],
  });
  await import(pathToFileURL(join(directory,"document-extraction-service.test.js")));
  await import(pathToFileURL(join(directory,"gemini-document-extraction-provider.test.js")));
} finally {
  await rm(directory, { recursive: true, force: true });
}
