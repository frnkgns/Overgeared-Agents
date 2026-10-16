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
} from "../integrations/export.mjs";
import { assertSourceValid } from "../integrations/lib/source.mjs";
import { install, readManifest, uninstall } from "../integrations/lib/install.mjs";

const source = loadSource();
const temp = () => mkdtempSync(join(tmpdir(), "oa-test-"));
const cleanup = (dir) => rmSync(dir, { recursive: true, force: true });

test("config test: exactly eight agents, PM is primary, specialists are subagents", () => {
  assert.deepEqual(assertSourceValid(source), []);
  assert.equal(source.agents.length, 8);
  const primary = source.agents.filter((a) => a.mode === "primary");
  assert.equal(primary.length, 1);
  assert.equal(primary[0].id, "oa-project-manager");
  assert.equal(source.agents.filter((a) => a.mode === "subagent").length, 7);
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

test("runtime test: Claude QA keeps shell but loses edit tools", () => {
  const qa = source.agents.find((a) => a.id === "oa-qa-engineer");
  const md = renderClaudeAgent(qa);
  assert.match(md, /tools: .*Bash/);
  assert.match(md, /disallowedTools: .*Edit/);
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
