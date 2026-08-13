import { build } from "esbuild";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const directory = await mkdtemp(join(process.cwd(), ".practice-import-tests-"));
const output = join(directory, "tests.cjs");
try {
  await build({
    entryPoints: ["features/practice-work/services/document-extraction-service.test.ts"],
    outfile: output,
    bundle: true,
    format: "cjs",
    platform: "node",
    target: "node22",
    external: ["mammoth", "pdf-parse", "pdf-lib", "jszip"],
    plugins: [{ name: "server-only", setup(builder) { builder.onResolve({ filter: /^server-only$/ }, () => ({ path: "server-only", namespace: "empty" })); builder.onLoad({ filter: /.*/, namespace: "empty" }, () => ({ contents: "export {};", loader: "js" })); } }],
  });
  await import(pathToFileURL(output));
} finally {
  await rm(directory, { recursive: true, force: true });
}
