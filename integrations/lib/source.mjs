// Canonical OA source loading for every runtime adapter.
//
// Single source of truth:
//   registry/agents.json        agent ids + primary
//   registry/skill-bindings.json  role -> installed GENTJIN/OA skill names
//   agents/<role>/agent.md      description, mode, non-skill permissions, body
//   agents/<role>/skills/<n>/SKILL.md
//
// The canonical agent frontmatter is OpenCode-V2-shaped. Other runtime adapters
// translate it; they never fork the content. Skill permissions are generated from
// the registry (plus each role's own OA skill) rather than authored by hand, so a
// binding change is reflected everywhere instead of drifting.

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

const stripQuotes = (s) => {
  const t = s.trim();
  if (t.length >= 2 && ((t[0] === '"' && t.endsWith('"')) || (t[0] === "'" && t.endsWith("'")))) {
    return t.slice(1, -1);
  }
  return t;
};

function parseBlock(lines) {
  const isList = lines[0].trimStart().startsWith("-");
  if (!isList) {
    const map = {};
    for (const l of lines) {
      const m = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(l.trim());
      if (!m) throw new Error(`unparseable block line: ${l}`);
      map[m[1]] = stripQuotes(m[2]);
    }
    return map;
  }
  const items = [];
  let cur = null;
  for (const l of lines) {
    const t = l.trim();
    if (t.startsWith("-")) {
      const m = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(t.slice(1).trim());
      if (m) {
        cur = {};
        cur[m[1]] = stripQuotes(m[2]);
        items.push(cur);
      } else {
        cur = null;
        items.push(stripQuotes(t.slice(1)));
      }
    } else {
      const m = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(t);
      if (!m || cur === null) throw new Error(`unparseable list continuation: ${l}`);
      cur[m[1]] = stripQuotes(m[2]);
    }
  }
  return items;
}

export function splitFrontmatter(text, label = "document") {
  const norm = text.replace(/\r\n/g, "\n");
  if (!norm.startsWith("---\n")) throw new Error(`${label}: missing opening frontmatter`);
  const end = norm.indexOf("\n---\n", 4);
  if (end < 0) throw new Error(`${label}: unterminated frontmatter`);
  const raw = norm.slice(4, end);
  const body = norm.slice(end + 5);

  const frontmatter = {};
  const lines = raw.split("\n");
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }
    const top = /^([A-Za-z0-9_-]+):(.*)$/.exec(line);
    if (!top) throw new Error(`${label}: unparseable frontmatter line "${line}"`);
    const key = top[1];
    const rest = top[2].trim();
    if (rest) {
      frontmatter[key] = stripQuotes(rest);
      i++;
      continue;
    }
    i++;
    const block = [];
    while (i < lines.length && lines[i].trim() && /^\s/.test(lines[i])) {
      block.push(lines[i]);
      i++;
    }
    frontmatter[key] = parseBlock(block);
  }
  return { frontmatter, body: body.replace(/\n+$/, "\n") };
}

function loadJson(rel) {
  return JSON.parse(readFileSync(join(REPO_ROOT, rel), "utf8"));
}

export function loadSource() {
  const registry = loadJson(join("registry", "agents.json"));
  const bindings = loadJson(join("registry", "skill-bindings.json")).bindings ?? {};

  const agents = registry.agents.map((id) => {
    const role = id.replace(/^oa-/, "");
    const dir = join(REPO_ROOT, "agents", role);
    const { frontmatter, body } = splitFrontmatter(
      readFileSync(join(dir, "agent.md"), "utf8"),
      `agents/${role}/agent.md`,
    );
    if (!frontmatter.description) throw new Error(`${id}: missing description`);
    if (!frontmatter.mode) throw new Error(`${id}: missing mode`);

    const skillsDir = join(dir, "skills");
    const skills = existsSync(skillsDir)
      ? readdirSync(skillsDir, { withFileTypes: true })
          .filter((e) => e.isDirectory())
          .map((e) => {
            const name = e.name;
            const path = join(skillsDir, name, "SKILL.md");
            const parsed = splitFrontmatter(readFileSync(path, "utf8"), `${name}/SKILL.md`);
            if (parsed.frontmatter.name !== name) {
              throw new Error(`skill folder "${name}" does not match frontmatter name "${parsed.frontmatter.name}"`);
            }
            return { name, dir: join(skillsDir, name), path, description: parsed.frontmatter.description, body: parsed.body };
          })
      : [];

    const oaSkills = skills.map((s) => s.name);
    const boundSkills = bindings[id] ?? [];

    return {
      id,
      role,
      dir,
      description: frontmatter.description,
      mode: frontmatter.mode,
      permissions: frontmatter.permissions ?? [],
      body,
      skills,
      skillNames: [...new Set([...oaSkills, ...boundSkills])],
      oaSkills,
      boundSkills,
    };
  });

  return { registry, bindings, agents, primary: registry.primary };
}

export function assertSourceValid({ agents }) {
  const errors = [];
  const ids = new Set(agents.map((a) => a.id));
  const modes = new Map(agents.map((a) => [a.id, a.mode]));
  const known = new Set(["edit", "shell", "webfetch", "websearch", "subagent", "skill", "read", "external_directory", "write"]);

  for (const a of agents) {
    if (a.skills.length !== 1) {
      errors.push(`${a.id}: expected exactly one OA skill, found ${a.skills.length}`);
    }
    for (const p of a.permissions) {
      if (!known.has(p.action)) errors.push(`${a.id}: unknown permission action "${p.action}"`);
      if (p.effect !== "deny" && p.effect !== "allow" && p.effect !== "ask") {
        errors.push(`${a.id}: permission effect must be deny|allow|ask, got "${p.effect}"`);
      }
      if (p.resource === undefined) errors.push(`${a.id}: permission "${p.action}" missing resource`);
    }
    const delegated = a.permissions.filter((p) => p.action === "subagent" && p.effect === "allow");
    for (const p of delegated) {
      if (!ids.has(p.resource)) errors.push(`${a.id}: delegates to unknown agent "${p.resource}"`);
    }
    if (a.mode === "primary" && delegated.length === 0) {
      errors.push(`${a.id}: primary agent has no delegation allowlist`);
    }
    if (a.mode !== "primary" && delegated.length > 0) {
      errors.push(`${a.id}: specialist must not delegate (found allowlist)`);
    }
  }
  const primaries = agents.filter((a) => a.mode === "primary");
  if (primaries.length !== 1) errors.push(`expected exactly one primary agent, found ${primaries.length}`);
  if (primaries[0] && primaries[0].id !== "oa-project-manager") {
    errors.push(`primary must be oa-project-manager, got ${primaries[0].id}`);
  }
  void modes;
  return errors;
}
