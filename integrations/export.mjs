#!/usr/bin/env node
// OA multi-runtime exporter.
//
// One canonical source (agents/<role>/agent.md + registry/) is rendered into each
// runtime's native layout. OpenCode is the verified reference runtime; the other
// adapters are format-researched and marked with their verification status in
// docs/multi-runtime-compatibility.md.
//
// Usage:
//   node integrations/export.mjs --runtime opencode [--to project|global|<dir>]
//   node integrations/export.mjs --runtime claude   [--to <dir>]
//   node integrations/export.mjs --runtime codex    [--to <dir>]
//   node integrations/export.mjs --runtime gemini   [--to <dir>]
//   node integrations/export.mjs --runtime chatgpt  [--to <dir>]
//   node integrations/export.mjs --runtime all      [--to <dir>]
//   Flags: --check (verify only), --force (back up and reclaim conflicts),
//          --uninstall (remove OA-owned files from the manifest),
//          --list (print planned artifacts and exit)
//
// Skill permissions are generated from registry/skill-bindings.json plus each
// role's own OA skill. They are not authored in agent.md, so a binding change
// cannot drift from the installed permission rules.

import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { REPO_ROOT, assertSourceValid, loadSource } from "./lib/source.mjs";
import { install, uninstall } from "./lib/install.mjs";

const OWNER = "overgeared-agents";

const PLAIN = /^[A-Za-z][A-Za-z0-9_.-]*$/;
const yamlScalar = (v) => (PLAIN.test(String(v)) ? String(v) : JSON.stringify(String(v)));

const skillPermissionRules = (agent) =>
  agent.skillNames.map((name) => ({ action: "skill", resource: name, effect: "allow" }));

const nonSkillPermissions = (agent) => agent.permissions.filter((p) => p.action !== "skill");

function renderOpenCodeAgent(agent) {
  const rules = [...nonSkillPermissions(agent), ...skillPermissionRules(agent)];
  const frontmatter = [
    "---",
    `description: ${agent.description}`,
    `mode: ${agent.mode}`,
    "permissions:",
    ...rules.flatMap((p) => [
      `  - action: ${p.action}`,
      `    resource: ${yamlScalar(p.resource)}`,
      `    effect: ${p.effect}`,
    ]),
    "---",
  ].join("\n");
  return `${frontmatter}\n${agent.body}`;
}

const hasDeny = (agent, action) => agent.permissions.some((p) => p.action === action && p.effect === "deny");

const promptBody = (agent) => agent.body.replace(/^\n+/, "");

const CLAUDE_WRITE_TOOLS = ["Edit", "Write", "MultiEdit", "NotebookEdit"];

// OA runs at build-equivalent permissions: an action with no rule is unrestricted,
// so a tool is present unless the source explicitly denies it.
function renderClaudeAgent(agent) {
  const tools = ["Read", "Grep", "Glob", "TodoWrite"];
  const disallowed = [];

  if (hasDeny(agent, "edit")) disallowed.push(...CLAUDE_WRITE_TOOLS);
  else tools.push(...CLAUDE_WRITE_TOOLS);

  if (hasDeny(agent, "shell")) disallowed.push("Bash");
  else tools.push("Bash");

  if (hasDeny(agent, "webfetch")) disallowed.push("WebFetch");
  else tools.push("WebFetch");

  if (hasDeny(agent, "websearch")) disallowed.push("WebSearch");
  else tools.push("WebSearch");

  if (agent.skillNames.length) tools.push("Skill");

  const delegation = agent.permissions
    .filter((p) => p.action === "subagent" && p.effect === "allow")
    .map((p) => p.resource);

  if (hasDeny(agent, "subagent") && delegation.length === 0) disallowed.push("Task");
  if (delegation.length) tools.push(`Task(${delegation.join(", ")})`);

  const frontmatter = [
    "---",
    `name: ${agent.id}`,
    `description: ${JSON.stringify(agent.description)}`,
    `tools: ${tools.join(", ")}`,
    disallowed.length ? `disallowedTools: ${disallowed.join(", ")}` : null,
    "---",
  ]
    .filter(Boolean)
    .join("\n");
  return `${frontmatter}\n\n${promptBody(agent)}`;
}

const tomlBasic = (value) =>
  `"${String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n").replace(/\r/g, "").replace(/\t/g, "\\t")}"`;

function renderCodexAgent(agent) {
  return [
    `name = ${tomlBasic(agent.id)}`,
    `description = ${tomlBasic(agent.description)}`,
    `developer_instructions = ${tomlBasic(promptBody(agent))}`,
    "",
  ].join("\n");
}

function renderGeminiAgent(agent) {
  const tools = ["read_file", "grep_search", "glob", "write_file", "replace", "run_shell_command", "web_fetch", "google_web_search"];
  if (agent.skillNames.length) tools.push("activate_skill");

  const frontmatter = [
    "---",
    `name: ${agent.id}`,
    `description: ${agent.description}`,
    "kind: local",
    `tools: [${tools.join(", ")}]`,
    agent.mode === "subagent" ? "max_turns: 40" : null,
    "---",
  ]
    .filter(Boolean)
    .join("\n");
  return `${frontmatter}\n\n${promptBody(agent)}`;
}

const COPILOT_TOOLS = { read: "read", edit: "edit", shell: "execute", search: "search", web: "web", todo: "todo", agent: "agent" };

function renderCopilotAgent(agent) {
  const tools = [COPILOT_TOOLS.read, COPILOT_TOOLS.search, COPILOT_TOOLS.todo, COPILOT_TOOLS.edit, COPILOT_TOOLS.shell, COPILOT_TOOLS.web];

  const delegable = agent.permissions
    .filter((p) => p.action === "subagent" && p.effect === "allow")
    .map((p) => p.resource);
  if (delegable.length) tools.push(COPILOT_TOOLS.agent);

  const frontmatter = [
    "---",
    `name: ${agent.id}`,
    `description: ${JSON.stringify(agent.description)}`,
    `tools: [${[...new Set(tools)].join(", ")}]`,
    delegable.length ? `agents: [${delegable.join(", ")}]` : null,
    "---",
  ]
    .filter(Boolean)
    .join("\n");
  return `${frontmatter}\n\n${promptBody(agent)}`;
}

function renderPromptPack(source, runtimeLabel) {
  const lines = [
    `# Overgeared Agents - ${runtimeLabel} system pack`,
    "",
    "Paste-ready instructions for any LLM chat surface with no filesystem agent loader.",
    "Enforcement is advisory here: roles, gates, and approval rules are instructions the",
    "model is asked to follow, not runtime-enforced permissions. Use a runtime adapter",
    "(OpenCode, Claude Code, Codex, Gemini CLI) when enforcement matters.",
    "",
    `Primary coordinator: \`${source.primary}\``,
    "",
    "## Team",
    "",
  ];
  for (const agent of source.agents) {
    lines.push(`### ${agent.id}`, "", agent.description, "");
    const perms = nonSkillPermissions(agent)
      .map((p) => `${p.action}:${p.effect}${p.resource !== "*" ? ` (${p.resource})` : ""}`)
      .join(", ");
    lines.push(`- mode: ${agent.mode}`);
    lines.push(`- permission intent: ${perms || "none"}`);
    lines.push(`- skills: ${agent.skillNames.join(", ") || "none"}`);
    lines.push("", "<details><summary>role instructions</summary>", "", promptBody(agent), "</details>", "");
  }
  return lines.join("\n");
}

function renderSkillPack(source, runtimeLabel) {
  const lines = [`# Overgeared Agents - OA skill pack (${runtimeLabel})`, ""];
  for (const agent of source.agents) {
    for (const skill of agent.skills) {
      lines.push(`## ${skill.name}`, "", skill.description, "", readFileSync(skill.path, "utf8").replace(/^---[\s\S]*?---\n/, ""), "");
    }
  }
  return lines.join("\n");
}

const fileList = (entries) =>
  entries.map(([relPath, content, kind, source]) => ({ relPath, content, kind, source }));

const globalConfigDir = () => join(homedir(), ".config", "opencode");

function adapterOpenCode(source, dest) {
  const root = resolve(dest) === resolve(globalConfigDir()) ? dest : join(dest, ".opencode");
  const files = [
    ...source.agents.map((a) => [
      join("agents", `${a.id}.md`),
      renderOpenCodeAgent(a),
      "agent",
      `agents/${a.role}/agent.md`,
    ]),
    ...source.agents.flatMap((a) =>
      a.skills.map((s) => [
        join("skills", s.name, "SKILL.md"),
        readFileSync(s.path, "utf8"),
        "skill",
        `agents/${a.role}/skills/${s.name}/SKILL.md`,
      ]),
    ),
  ];
  return [{ root, label: "OpenCode", files: fileList(files) }];
}

function adapterClaude(source, dest) {
  const root = join(dest, ".claude");
  const files = [
    ...source.agents.map((a) => [join("agents", `${a.id}.md`), renderClaudeAgent(a), "agent", `agents/${a.role}/agent.md`]),
    ...source.agents.flatMap((a) =>
      a.skills.map((s) => [join("skills", s.name, "SKILL.md"), readFileSync(s.path, "utf8"), "skill", `agents/${a.role}/skills/${s.name}/SKILL.md`]),
    ),
  ];
  const permissionRules = {
    _comment:
      "Merge the deny rules below into .claude/settings.json permissions.deny. They carry the path/shell denies that per-agent frontmatter cannot express.",
    permissions: {
      deny: [
        "Read(./**/*.env)",
        "Read(./**/*.env.*)",
        "Bash(git push --force:*)",
        "Bash(git push -f:*)",
        "Bash(git reset --hard:*)",
        "Bash(git rebase:*)",
        "Bash(git filter-branch:*)",
      ],
    },
  };
  files.push([join("oa-permissions.json"), JSON.stringify(permissionRules, null, 2) + "\n", "config", "integrations/export.mjs"]);
  return [{ root, label: "Claude Code", files: fileList(files) }];
}

function adapterCodex(source, dest) {
  const agentsRoot = join(dest, ".codex");
  const skillsRoot = join(dest, ".agents");
  const agentFiles = fileList(
    source.agents.map((a) => [join("agents", `${a.id}.toml`), renderCodexAgent(a), "agent", `agents/${a.role}/agent.md`]),
  );
  const skillFiles = fileList(
    source.agents.flatMap((a) =>
      a.skills.map((s) => [join("skills", s.name, "SKILL.md"), readFileSync(s.path, "utf8"), "skill", `agents/${a.role}/skills/${s.name}/SKILL.md`]),
    ),
  );
  return [
    { root: agentsRoot, label: "Codex (agents)", files: agentFiles },
    { root: skillsRoot, label: "Codex (skills)", files: skillFiles },
  ];
}

function adapterGemini(source, dest) {
  const root = join(dest, ".gemini");
  const files = [
    ...source.agents.map((a) => [join("agents", `${a.id}.md`), renderGeminiAgent(a), "agent", `agents/${a.role}/agent.md`]),
    ...source.agents.flatMap((a) =>
      a.skills.map((s) => [join("skills", s.name, "SKILL.md"), readFileSync(s.path, "utf8"), "skill", `agents/${a.role}/skills/${s.name}/SKILL.md`]),
    ),
  ];
  return [{ root, label: "Gemini CLI", files: fileList(files) }];
}

function adapterCopilot(source, dest) {
  const root = join(dest, ".github");
  const files = [
    ...source.agents.map((a) => [join("agents", `${a.id}.agent.md`), renderCopilotAgent(a), "agent", `agents/${a.role}/agent.md`]),
    ...source.agents.flatMap((a) =>
      a.skills.map((s) => [join("skills", s.name, "SKILL.md"), readFileSync(s.path, "utf8"), "skill", `agents/${a.role}/skills/${s.name}/SKILL.md`]),
    ),
  ];
  return [{ root, label: "GitHub Copilot", files: fileList(files) }];
}

function adapterGeneric(source, dest) {
  const root = join(dest, "prompt-pack");
  const files = fileList([
    ["oa-system-pack.md", renderPromptPack(source, "generic / any LLM"), "pack", "integrations/export.mjs"],
    ["oa-skills.md", renderSkillPack(source, "copy only"), "pack", "integrations/export.mjs"],
    ...source.agents.map((a) => [
      join("agents", `${a.id}.md`),
      `# ${a.id}\n\n${a.description}\n\n${promptBody(a)}`,
      "agent",
      `agents/${a.role}/agent.md`,
    ]),
  ]);
  return [{ root, label: "ChatGPT / generic prompt pack", files }];
}

const ADAPTERS = {
  opencode: adapterOpenCode,
  claude: adapterClaude,
  codex: adapterCodex,
  gemini: adapterGemini,
  copilot: adapterCopilot,
  chatgpt: adapterGeneric,
  generic: adapterGeneric,
};

function resolveDest(runtime, rawTo) {
  if (runtime === "opencode") {
    if ((rawTo ?? "project") === "project") return REPO_ROOT;
    if (rawTo === "global") return join(homedir(), ".config", "opencode");
    return resolve(rawTo);
  }
  if (rawTo) return resolve(rawTo);
  return join(REPO_ROOT, "integrations", "dist", runtime);
}

function parseArgs(argv) {
  const args = argv.slice(2);
  const flag = (name) => args.includes(name);
  const value = (name, fallback) => {
    const i = args.indexOf(name);
    if (i < 0) return fallback;
    const next = args[i + 1];
    if (next === undefined || next.startsWith("--")) return true;
    return next;
  };
  return {
    runtime: value("--runtime", "opencode"),
    to: value("--to", undefined),
    check: flag("--check"),
    force: flag("--force"),
    uninstall: flag("--uninstall"),
    list: flag("--list"),
  };
}

function main() {
  const opts = parseArgs(process.argv);
  const runtime = opts.runtime;
  if (runtime === true || !runtime) throw new Error("--runtime requires a value");

  const runtimes =
    runtime === "all" ? ["opencode", "claude", "codex", "gemini", "copilot", "chatgpt"] : [runtime];
  for (const r of runtimes) {
    if (!ADAPTERS[r]) throw new Error(`unknown runtime "${r}" (expected opencode|claude|codex|gemini|copilot|chatgpt|generic|all)`);
  }

  const source = loadSource();
  const sourceErrors = assertSourceValid(source);
  if (sourceErrors.length) {
    for (const e of sourceErrors) console.error(`  ! source: ${e}`);
    process.exit(1);
  }

  let failures = 0;
  for (const r of runtimes) {
    const dest = resolveDest(r, opts.to);
    const installs = ADAPTERS[r](source, dest);
    for (const unit of installs) {
      if (opts.list) {
        console.log(`[${unit.label}] ${unit.root}`);
        for (const f of unit.files) console.log(`  - ${f.relPath}`);
        continue;
      }
      if (opts.uninstall) {
        const res = uninstall({ root: unit.root });
        console.log(`[${unit.label}] uninstalled from ${unit.root}: ${res.removed.length} removed, ${res.preserved.length} preserved`);
        for (const e of res.errors) console.log(`  ~ ${e}`);
        continue;
      }
      const res = install({
        root: unit.root,
        owner: OWNER,
        target: dest,
        files: unit.files,
        force: opts.force,
        check: opts.check,
      });
      const verb = opts.check ? "checked" : "installed";
      console.log(`[${unit.label}] ${verb} ${res.owned.length} artifacts -> ${unit.root}`);
      for (const n of res.notes) console.log(`  ~ ${n}`);
      for (const e of res.errors) {
        console.error(`  ! ${e}`);
        failures++;
      }
    }
  }
  process.exit(failures ? 1 : 0);
}

const isMain = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));

if (isMain) {
  try {
    main();
  } catch (err) {
    console.error(`export failed: ${err.message}`);
    process.exit(2);
  }
}

export {
  ADAPTERS,
  renderOpenCodeAgent,
  renderClaudeAgent,
  renderCodexAgent,
  renderGeminiAgent,
  renderCopilotAgent,
  renderPromptPack,
  resolveDest,
  loadSource,
  skillPermissionRules,
};
