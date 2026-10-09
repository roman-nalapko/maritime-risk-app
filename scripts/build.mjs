import { cp, mkdir, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { runReleaseChecks } from "./release-checks.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = path.join(root, "src");
const output = path.join(root, "dist");

await runReleaseChecks(path.join(source, "data"));
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await cp(source, output, { recursive: true });
console.log(`Built static site at ${output}`);

