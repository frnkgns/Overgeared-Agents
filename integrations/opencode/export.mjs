#!/usr/bin/env node
// Backward-compatible entry point.
//
// The multi-runtime exporter lives at integrations/export.mjs. This wrapper keeps
// the historical OpenCode-only invocation working:
//   node integrations/opencode/export.mjs --target project|global|<dir> [--check] [--force]
// It maps --target to the unified --runtime opencode --to <dest>.
//
// New usage: node integrations/export.mjs --runtime opencode|claude|codex|gemini|copilot|chatgpt|all

import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const unified = resolve(here, "..", "export.mjs");

const args = process.argv.slice(2);
const mapped = ["--runtime", "opencode"];
let target = "project";

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === "--target") {
    target = args[++i] ?? "project";
    continue;
  }
  mapped.push(arg);
}
mapped.push("--to", target);

const result = spawnSync(process.execPath, [unified, ...mapped], { stdio: "inherit" });
process.exit(result.status ?? 1);
