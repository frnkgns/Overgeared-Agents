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

test("permission test: the only declared rules are generated skill bindings", () => {
  for (const agent of source.agents) {
    for (const rule of allRules(agent)) {
      assert.ok(
        rule.action === "skill",
        `${agent.id} declares a ${rule.action} rule; OA declares only skill bindings`,
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

test("permission test: no OA agent declares delegation rules; the allowlist is registry data", () => {
  for (const agent of source.agents) {
    assert.equal(rulesFor(agent, "subagent").length, 0, `${agent.id} declares subagent rules`);
  }
  assert.deepEqual([...source.delegationAllowlist].sort(), [
    "oa-backend-developer",
    "oa-cybersecurity",
    "oa-devops",
    "oa-external-researcher",
    "oa-frontend-developer",
    "oa-git-manager",
    "oa-internal-researcher",
    "oa-qa-engineer",
  ]);
});

test("config test: exactly eight subagents and no custom primary agent", () => {
  assert.deepEqual(assertSourceValid(source), []);
  assert.equal(source.agents.length, 8);
  assert.equal(source.agents.filter((a) => a.mode === "primary").length, 0);
  assert.equal(source.agents.filter((a) => a.mode === "subagent").length, 8);
  assert.equal(source.primary, null);
});

test("migration test: zero custom primaries is valid and two primaries are rejected", () => {
  const qa = source.agents.find((a) => a.id === "oa-qa-engineer");
  const frontend = source.agents.find((a) => a.id === "oa-frontend-developer");
  const errors = assertSourceValid({
    ...source,
    agents: [
      { ...qa, mode: "primary", permissions: [] },
      { ...frontend, mode: "primary", permissions: [] },
    ],
  });
  assert.ok(errors.some((e) => e.includes("at most one primary")));
});

test("migration test: the delegation allowlist must reference known agents", () => {
  const errors = assertSourceValid({ ...source, delegationAllowlist: ["oa-does-not-exist"] });
  assert.ok(errors.some((e) => e.includes("delegation allowlist references unknown agent")));
});

test("migration test: oa-orchestration ships as a shared skill for every runtime", () => {
  assert.ok(source.sharedSkills.some((s) => s.name === "oa-orchestration"));
  for (const runtime of ["opencode", "claude", "codex", "gemini", "copilot"]) {
    const units = ADAPTERS[runtime](source, "/tmp/ignored");
    const paths = units.flatMap((u) => u.files.map((f) => f.relPath.split("\\").join("/")));
    assert.ok(paths.includes("skills/oa-orchestration/SKILL.md"), `${runtime} missing shared orchestration skill`);
  }
  const generic = ADAPTERS.chatgpt(source, "/tmp/ignored");
  const pack = generic[0].files.find((f) => f.relPath.endsWith("oa-skills.md"));
  assert.match(pack.content, /OA Orchestration/);
});

test("migration test: shared skills are not bound to a specialist agent", () => {
  for (const agent of source.agents) {
    assert.ok(!agent.skillNames.includes("oa-orchestration"), `${agent.id} must not bind the shared orchestration skill`);
  }
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

test("validator test: a specialist that declares a delegation allowlist is rejected", () => {
  const qa = source.agents.find((a) => a.id === "oa-qa-engineer");
  const probe = {
    ...qa,
    permissions: [...qa.permissions, { action: "subagent", resource: "oa-devops", effect: "allow" }],
  };
  const errors = assertSourceValid({ ...source, agents: [probe] });
  assert.ok(errors.some((e) => e.includes("specialist must not delegate")));
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

test("export test: OpenCode layout is 8 agents + 10 skills", () => {
  const [unit] = ADAPTERS.opencode(source, "/tmp/ignored");
  const agents = unit.files.filter((f) => f.kind === "agent");
  const skills = unit.files.filter((f) => f.kind === "skill");
  assert.equal(agents.length, 8);
  assert.equal(skills.length, 10);
  for (const a of agents) assert.match(a.relPath, /^agents[/\\]oa-[a-z-]+\.md$/);
  for (const s of skills) assert.match(s.relPath, /^skills[/\\][a-z-]+[/\\]SKILL\.md$/);
});

test("export test: OpenCode installs the delegation instruction and does not bind it as a skill", () => {
  const [unit] = ADAPTERS.opencode(source, "/tmp/ignored");
  const instruction = unit.files.find((f) => f.relPath === "oa-delegation.md");
  assert.ok(instruction, "OpenCode install is missing oa-delegation.md");
  assert.equal(instruction.kind, "instruction");
  assert.match(instruction.content, /Loading a skill is not delegation/);
  for (const agent of source.agents) {
    assert.ok(!agent.skillNames.includes("oa-delegation.md"), `${agent.id} binds the instruction as a skill`);
    assert.ok(!agent.skillNames.includes("oa-delegation"), `${agent.id} binds the instruction as a skill`);
  }
  for (const runtime of ["claude", "codex", "gemini", "copilot"]) {
    const units = ADAPTERS[runtime](source, "/tmp/ignored");
    assert.ok(
      !units.flatMap((u) => u.files).some((f) => f.relPath.endsWith("oa-delegation.md")),
      `${runtime} must not install the OpenCode-only instruction`,
    );
  }
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
  const expected = { opencode: 21, claude: 19, codex: 18, gemini: 18, copilot: 18 };
  for (const [runtime, count] of Object.entries(expected)) {
    const units = ADAPTERS[runtime](source, "/tmp/ignored");
    const total = units.reduce((n, u) => n + u.files.length, 0);
    assert.equal(total, count, `${runtime} produced ${total} artifacts`);
  }
  const generic = ADAPTERS.chatgpt(source, "/tmp/ignored");
  assert.ok(generic[0].files.length >= 10);
});

test("runtime test: Codex agents use TOML with developer_instructions", () => {
  const frontend = source.agents.find((a) => a.id === "oa-frontend-developer");
  const toml = renderCodexAgent(frontend);
  assert.match(toml, /^name = "oa-frontend-developer"$/m);
  assert.match(toml, /developer_instructions = "/);
});

test("runtime test: no OA specialist renders a Claude Task() delegation allowlist", () => {
  for (const agent of source.agents) {
    const md = renderClaudeAgent(agent);
    assert.ok(!/tools: .*Task\(/.test(md), `${agent.id} unexpectedly delegates`);
  }
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
    const target = join(unit.root, "agents", "oa-qa-engineer.md");
    writeFileSync(target, readFileSync(target, "utf8") + "\nUSER EDIT MARKER\n");

    const again = install({ root: unit.root, owner: "t", target: dir, files: unit.files });
    assert.ok(again.errors.some((e) => e.includes("conflict")));
    assert.match(readFileSync(target, "utf8"), /USER EDIT MARKER/);
  } finally {
    cleanup(dir);
  }
});

test("install test: --force backs up the conflicting file before reclaiming", () => {
  const dir = temp();
  try {
    const [unit] = ADAPTERS.opencode(source, dir);
    install({ root: unit.root, owner: "t", target: dir, files: unit.files });
    const target = join(unit.root, "agents", "oa-qa-engineer.md");
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
    const target = join(unit.root, "agents", "oa-qa-engineer.md");
    writeFileSync(target, "PREEXISTING USER AGENT\n");

    const res = install({ root: unit.root, owner: "t", target: dir, files: unit.files });
    assert.ok(res.errors.some((e) => e.includes("unowned existing file")));
    assert.equal(readFileSync(target, "utf8"), "PREEXISTING USER AGENT\n");
  } finally {
    cleanup(dir);
  }
});

test("install test: artifacts dropped from the export are pruned on reinstall", () => {
  const dir = temp();
  try {
    const [unit] = ADAPTERS.opencode(source, dir);
    install({ root: unit.root, owner: "t", target: dir, files: unit.files });
    const retired = join(unit.root, "skills", "oa-ui-ux", "SKILL.md");
    assert.ok(existsSync(retired));

    const reduced = unit.files.filter((f) => !f.relPath.split("\\").join("/").endsWith("skills/oa-ui-ux/SKILL.md"));
    const res = install({ root: unit.root, owner: "t", target: dir, files: reduced });
    assert.equal(res.errors.length, 0);
    assert.ok(res.removed.includes("skills/oa-ui-ux/SKILL.md"));
    assert.ok(!existsSync(retired));
    assert.ok(!readManifest(unit.root).files.some((f) => f.path.includes("oa-ui-ux")));
  } finally {
    cleanup(dir);
  }
});

test("install test: a stale owned file with local edits is preserved, not pruned", () => {
  const dir = temp();
  try {
    const [unit] = ADAPTERS.opencode(source, dir);
    install({ root: unit.root, owner: "t", target: dir, files: unit.files });
    const edited = join(unit.root, "skills", "oa-ui-ux", "SKILL.md");
    writeFileSync(edited, "user changed this skill\n");

    const reduced = unit.files.filter((f) => !f.relPath.split("\\").join("/").endsWith("skills/oa-ui-ux/SKILL.md"));
    const res = install({ root: unit.root, owner: "t", target: dir, files: reduced });
    assert.ok(res.notes.some((n) => n.includes("preserved stale owned file")));
    assert.equal(readFileSync(edited, "utf8"), "user changed this skill\n");
    assert.ok(!res.removed.includes("skills/oa-ui-ux/SKILL.md"));
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
      "oa-backend-developer.md",
      "oa-cybersecurity.md",
      "oa-devops.md",
      "oa-external-researcher.md",
      "oa-frontend-developer.md",
      "oa-git-manager.md",
      "oa-internal-researcher.md",
      "oa-qa-engineer.md",
    ]);
  } finally {
    cleanup(dir);
  }
});
