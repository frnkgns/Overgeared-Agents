import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  ADAPTERS,
  loadSource,
  renderClaudeAgent,
  renderCodexAgent,
  renderOpenCodeAgent,
  resolveDest,
} from "../integrations/export.mjs";
import { assertSourceValid } from "../integrations/lib/source.mjs";
import { install, readManifest, uninstall } from "../integrations/lib/install.mjs";

const source = loadSource();
const temp = () => mkdtempSync(join(tmpdir(), "oa-test-"));
const cleanup = (dir) => rmSync(dir, { recursive: true, force: true });
const rulesFor = (agent, action) => agent.permissions.filter((p) => p.action === action);
const effectFor = (agent, action, effect) => rulesFor(agent, action).find((p) => p.effect === effect);

const allRules = (agent) => agent.permissions;

test("permission test: OA never restricts below the OpenCode base policy", () => {
  const restricted = ["edit", "shell", "read", "webfetch", "websearch", "question", "external_directory", "glob", "grep", "execute"];
  for (const agent of source.agents) {
    for (const rule of allRules(agent).filter((p) => restricted.includes(p.action))) {
      assert.notEqual(rule.effect, "deny", `${agent.id} denies ${rule.action}, which build allows`);
      assert.notEqual(rule.effect, "ask", `${agent.id} asks on ${rule.action}, which prompts`);
    }
  }
});

test("permission test: the only declared rules are skill bindings and the PM delegation allowlist", () => {
  for (const agent of source.agents) {
    for (const rule of allRules(agent)) {
      assert.ok(
        rule.action === "skill" || rule.action === "subagent",
        `${agent.id} declares a ${rule.action} rule; OA declares none at build-equivalence`,
      );
    }
  }
});

test("permission test: every role is unrestricted on question, web, and shell", () => {
  for (const agent of source.agents) {
    for (const action of ["question", "webfetch", "websearch", "shell", "edit", "read", "external_directory"]) {
      assert.equal(rulesFor(agent, action).length, 0, `${agent.id} still restricts ${action}`);
    }
  }
});

test("permission test: the PM still delegates only to the seven specialists", () => {
  const primary = source.agents.find((a) => a.mode === "primary");
  const allowed = rulesFor(primary, "subagent").filter((p) => p.effect === "allow").map((p) => p.resource).sort();
  assert.deepEqual(allowed, [
    "oa-cybersecurity",
    "oa-devops",
    "oa-external-researcher",
    "oa-full-stack-developer",
    "oa-git-manager",
    "oa-internal-researcher",
    "oa-qa-engineer",
  ]);
});

test("config test: exactly eight agents, PM is primary, specialists are subagents", () => {
  assert.deepEqual(assertSourceValid(source), []);
  assert.equal(source.agents.length, 8);
  const primary = source.agents.filter((a) => a.mode === "primary");
  assert.equal(primary.length, 1);
  assert.equal(primary[0].id, "oa-project-manager");
  assert.equal(source.agents.filter((a) => a.mode === "subagent").length, 7);
});

test("validator test: the accepted action set matches the documented V2 actions", () => {
  const base = source.agents.find((a) => a.id === "oa-qa-engineer");
  const accepted = ["question", "execute", "glob", "grep", "edit", "shell", "read", "subagent", "skill"];
  for (const action of accepted) {
    const probe = { ...base, permissions: [{ action, resource: "*", effect: "deny" }] };
    const unknown = assertSourceValid({ agents: [probe] }).filter((e) => e.includes("unknown permission action"));
    assert.deepEqual(unknown, [], `${action} should be accepted`);
  }
  for (const action of ["write", "bash", "task", "permission", "doom_loop", "lsp"]) {
    const probe = { ...base, permissions: [{ action, resource: "*", effect: "deny" }] };
    const unknown = assertSourceValid({ agents: [probe] }).filter((e) => e.includes("unknown permission action"));
    assert.deepEqual(unknown.length, 1, `${action} should be rejected as unknown`);
  }
});

test("validator test: a role that denies or asks below the base policy is rejected", () => {
  const qa = source.agents.find((a) => a.id === "oa-qa-engineer");
  for (const effect of ["deny", "ask"]) {
    for (const action of ["edit", "shell", "question", "webfetch", "read"]) {
      const probe = { ...qa, permissions: [...qa.permissions, { action, resource: "*", effect }] };
      const errors = assertSourceValid({ agents: [probe] });
      assert.ok(
        errors.some((e) => e.includes(`${action} ${effect}`) && e.includes("restricts below the OpenCode base policy")),
        `${action} ${effect} should fail the export`,
      );
    }
  }
});

test("validator test: the PM delegation allowlist may still deny subagent", () => {
  assert.deepEqual(assertSourceValid(source), []);
});

test("export test: a global install lands in the OpenCode config root, not a nested .opencode", () => {
  const dest = resolveDest("opencode", "global");
  const [unit] = ADAPTERS.opencode(source, dest);
  assert.equal(unit.root, dest);
  assert.equal(unit.root.endsWith(".opencode"), false);
});

test("export test: a project install lands in the project's .opencode directory", () => {
  const dest = join(tmpdir(), "oa-project-dest");
  const [unit] = ADAPTERS.opencode(source, dest);
  assert.equal(unit.root, join(dest, ".opencode"));
});

test("export test: OpenCode layout is 8 agents + 8 skills", () => {
  const [unit] = ADAPTERS.opencode(source, "/tmp/ignored");
  const agents = unit.files.filter((f) => f.kind === "agent");
  const skills = unit.files.filter((f) => f.kind === "skill");
  assert.equal(agents.length, 8);
  assert.equal(skills.length, 8);
  for (const a of agents) assert.match(a.relPath, /^agents[/\\]oa-[a-z-]+\.md$/);
  for (const s of skills) assert.match(s.relPath, /^skills[/\\][a-z-]+[/\\]SKILL\.md$/);
});

test("skill binding test: OpenCode skill permissions are generated from the registry", () => {
  for (const agent of source.agents) {
    const rendered = renderOpenCodeAgent(agent);
    for (const name of agent.skillNames) {
      assert.ok(
        rendered.includes(`resource: ${name}`),
        `${agent.id} missing generated skill permission for ${name}`,
      );
    }
    const matches = rendered.match(/action: skill/g) ?? [];
    assert.equal(matches.length, agent.skillNames.length);
  }
});

test("export test: every runtime renders its full artifact set", () => {
  const expected = { opencode: 16, claude: 17, codex: 16, gemini: 16, copilot: 16 };
  for (const [runtime, count] of Object.entries(expected)) {
    const units = ADAPTERS[runtime](source, "/tmp/ignored");
    const total = units.reduce((n, u) => n + u.files.length, 0);
    assert.equal(total, count, `${runtime} produced ${total} artifacts`);
  }
  const generic = ADAPTERS.chatgpt(source, "/tmp/ignored");
  assert.ok(generic[0].files.length >= 10);
});

test("runtime test: Codex agents use TOML with developer_instructions", () => {
  const pm = source.agents.find((a) => a.id === "oa-project-manager");
  const toml = renderCodexAgent(pm);
  assert.match(toml, /^name = "oa-project-manager"$/m);
  assert.match(toml, /developer_instructions = "/);
});

test("runtime test: Claude PM gets a Task() delegation allowlist and never both allow and deny Task", () => {
  const pm = source.agents.find((a) => a.id === "oa-project-manager");
  const md = renderClaudeAgent(pm);
  assert.match(md, /tools: .*Task\(oa-internal-researcher/);
  const disallowed = /disallowedTools: (.*)/.exec(md)?.[1] ?? "";
  assert.ok(!disallowed.split(",").map((s) => s.trim()).includes("Task"));
});

test("runtime test: Claude agents get the full tool set at build-equivalence", () => {
  const qa = source.agents.find((a) => a.id === "oa-qa-engineer");
  const md = renderClaudeAgent(qa);
  assert.match(md, /tools: .*Bash/);
  assert.match(md, /tools: .*Edit/);
  assert.ok(!/disallowedTools:/.test(md), `QA declares no restrictions, so nothing should be disallowed:\n${md}`);
});

test("install test: install is idempotent", () => {
  const dir = temp();
  try {
    const [unit] = ADAPTERS.opencode(source, dir);
    const first = install({ root: unit.root, owner: "t", target: dir, files: unit.files });
    assert.equal(first.written, true);
    assert.equal(first.errors.length, 0);
    const firstManifest = readManifest(unit.root).files.length;

    const second = install({ root: unit.root, owner: "t", target: dir, files: unit.files });
    assert.equal(second.errors.length, 0);
    assert.equal(second.conflicts.length, 0);
    assert.equal(readManifest(unit.root).files.length, firstManifest);
  } finally {
    cleanup(dir);
  }
});

test("install test: a user-edited owned file is not overwritten without --force", () => {
  const dir = temp();
  try {
    const [unit] = ADAPTERS.opencode(source, dir);
    install({ root: unit.root, owner: "t", target: dir, files: unit.files });
    const target = join(unit.root, "agents", "oa-project-manager.md");
    writeFileSync(target, readFileSync(target, "utf8").replace("the only agent", "the ONLY agent"));

    const again = install({ root: unit.root, owner: "t", target: dir, files: unit.files });
    assert.ok(again.errors.some((e) => e.includes("conflict")));
    assert.match(readFileSync(target, "utf8"), /the ONLY agent/);
  } finally {
    cleanup(dir);
  }
});

test("install test: --force backs up the conflicting file before reclaiming", () => {
  const dir = temp();
  try {
    const [unit] = ADAPTERS.opencode(source, dir);
    install({ root: unit.root, owner: "t", target: dir, files: unit.files });
    const target = join(unit.root, "agents", "oa-project-manager.md");
    writeFileSync(target, "USER EDIT\n");

    const forced = install({ root: unit.root, owner: "t", target: dir, files: unit.files, force: true });
    assert.equal(forced.errors.length, 0);
    assert.ok(forced.notes.some((n) => n.includes("backed up")));
    assert.ok(!readFileSync(target, "utf8").includes("USER EDIT"));
    assert.ok(existsSync(join(unit.root, "oa-backups")));
  } finally {
    cleanup(dir);
  }
});

test("install test: an unowned pre-existing file is never overwritten", () => {
  const dir = temp();
  try {
    const [unit] = ADAPTERS.opencode(source, dir);
    mkdirSync(join(unit.root, "agents"), { recursive: true });
    const target = join(unit.root, "agents", "oa-project-manager.md");
    writeFileSync(target, "PREEXISTING USER AGENT\n");

    const res = install({ root: unit.root, owner: "t", target: dir, files: unit.files });
    assert.ok(res.errors.some((e) => e.includes("unowned existing file")));
    assert.equal(readFileSync(target, "utf8"), "PREEXISTING USER AGENT\n");
  } finally {
    cleanup(dir);
  }
});

test("uninstall test: owned files are removed, user edits preserved", () => {
  const dir = temp();
  try {
    const [unit] = ADAPTERS.opencode(source, dir);
    install({ root: unit.root, owner: "t", target: dir, files: unit.files });
    const edited = join(unit.root, "skills", "oa-orchestration", "SKILL.md");
    writeFileSync(edited, "user changed this skill\n");

    const res = uninstall({ root: unit.root });
    assert.ok(res.removed.length >= 15);
    assert.deepEqual(res.preserved, ["skills/oa-orchestration/SKILL.md"]);
    assert.ok(existsSync(edited));
    assert.ok(!existsSync(join(unit.root, "oa-manifest.json")));
    assert.ok(!existsSync(join(unit.root, "agents", "oa-qa-engineer.md")));
  } finally {
    cleanup(dir);
  }
});

test("uninstall test: uninstall without a manifest reports instead of deleting", () => {
  const dir = temp();
  try {
    const res = uninstall({ root: join(dir, ".opencode") });
    assert.ok(res.errors.some((e) => e.includes("no OA manifest")));
    assert.equal(res.removed.length, 0);
  } finally {
    cleanup(dir);
  }
});

test("config test: the installed agent directory holds exactly the eight OA agents", () => {
  const dir = temp();
  try {
    const [unit] = ADAPTERS.opencode(source, dir);
    install({ root: unit.root, owner: "t", target: dir, files: unit.files });
    const names = readManifest(unit.root)
      .files.filter((f) => f.path.startsWith("agents/"))
      .map((f) => f.path.replace("agents/", ""))
      .sort();
    assert.deepEqual(names, [
      "oa-cybersecurity.md",
      "oa-devops.md",
      "oa-external-researcher.md",
      "oa-full-stack-developer.md",
      "oa-git-manager.md",
      "oa-internal-researcher.md",
      "oa-project-manager.md",
      "oa-qa-engineer.md",
    ]);
  } finally {
    cleanup(dir);
  }
});
