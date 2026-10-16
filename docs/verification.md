# Verification Plan and Results

**Environment:** OpenCode v2.0.28, GENTJIN installed commit b864378, Windows.
**Method:** project-local `.opencode/` export, exercised with a private standalone
server (`opencode run --standalone --agent <id>` and `opencode serve` + `opencode api`).

## Verified (observed)

- [x] **Agent discovery + load** - `oa-project-manager` resolved and replied `OA-OK`.
      Confirms OpenCode v2 discovers `.opencode/agents/oa-*.md` and parses the V2
      frontmatter (`mode`, `permissions` rule list).
- [x] **Real subagent delegation** - PM launched `oa-external-researcher` through the
      actual `subagent` tool; child session `ses_ebcda8173ffe...` returned `SUB-OK`
      and the PM reported it. Not simulated.
- [x] **Delegation allowlist enforcement** - PM launching the built-in `general` agent
      returned `{"status":"error","error":"Permission denied: subagent"}` even with
      `--auto`. Explicit `deny` holds under auto-approve.
- [x] **OA skill loading** - `skill` tool loaded `oa-orchestration` from
      `.opencode/skills/oa-orchestration/SKILL.md`; agent replied `SKILL-OK`.
- [x] **GENTJIN skill reuse by name** - `skill` tool loaded `requirements-review` from
      `~/.config/opencode/skills/requirements-review/SKILL.md` inside an OA agent;
      agent replied `GENTJIN-SKILL-OK`.
- [x] **Config merge** - `opencode debug config` shows the global config, the global
      skills directory, and the project `.opencode/opencode.jsonc` + `.opencode`
      directory all contributing. `default_agent` was verified applied while it was
      set in the project config; it has since been removed so new sessions start on
      OpenCode's built-in `build` agent and OA is selected explicitly. See
      `docs/permissions.md`.

## Findings / gaps

- **Direct specialist invocation is possible.** A `mode: subagent` agent
  (`oa-external-researcher`) could still be selected directly with `--agent`. This
  confirms the plan's warning that native routing does not guarantee all invocations
  pass through the PM. Protected writes must still require valid scoped workflow state.
- **`GET /api/agent` returned `[]`** for the project location even though agents load
  and run. That endpoint is not a reliable discovery probe in this build; use an
  actual agent run (`opencode run --standalone --agent <id>`) to verify. Not treated
  as a load failure because the run proved loading.
- **GENTJIN plugin tools are only reachable through Code Mode `execute`.** In
  OpenCode v2.0.28, `gentjin_discovery`, `gentjin_capability`, and
  `gentjin_release_notes` are **not** exposed as direct tools to any agent. A direct
  call fails for the built-in `build` agent and for every custom OA agent alike:
  `No tool named "gentjin_discovery" is currently available`. They **are** reachable
  inside the Code Mode `execute` sandbox as `tools.gentjin_discovery(...)`. Verified:
  `oa-project-manager` ran `execute { code: 'return await tools.gentjin_discovery({ action: "resolve" })' }`
  and returned `EXEC-OK`. A minimal custom agent without `permissions` and one with
  `tools: { gentjin_discovery: true }` both still failed a **direct** call, so this is
  a runtime exposure rule, not an OA permission effect. This refines the GENTJIN
  2026-10-07 note: the earlier child-session result was genuine because the child used
  the same `execute` proxy. OA agents must reach GENTJIN tools via `execute`, or read
  the resolved vault path directly.

## Milestone B/C runtime demonstrations

- [x] **All 8 roles discoverable** - each `oa-*` id selected with `--agent` and replied
      with its own id. `docs/evidence/all-roles-discoverable.txt`.
- [x] **End-to-end happy path** - PM -> `oa-internal-researcher` (vault glob returned 0
      matches -> honest `no_relevant_notes`) -> PM -> `oa-full-stack-developer` ->
      PM -> `oa-qa-engineer` (real `npm test`, exit 0) -> PM.
      `docs/evidence/milestone-b-happy.txt`.
- [x] **Failed-check routing** - the PM briefed the developer narrowly; the QA Engineer
      verified against `SPEC.md` and **failed** the SPEC/README criteria; the PM routed
      the findings back to the developer (attempt 2) and QA re-verified to **PASS**.
      2 review cycles, real commands and exit statuses.
      `docs/evidence/milestone-b-qa-failure.txt`.
- [x] **Security + DevOps gate delegation** - the PM loaded the canonical
      `security-review` / `deployment-readiness` bodies and passed them into the
      Cybersecurity and DevOps subagents.
      `docs/evidence/milestone-c-security-devops-git.txt`.
- [x] **Git authorization gate** - asked to commit with no authorization and no QA/security
      verdict, the Git Manager performed read-only investigation and made **no commit**;
      `git log` still showed 1 commit and the working tree merely modified. No unauthorized
      mutation occurred. `docs/evidence/git-manager-refusal.txt`.
      Caveat: the model run exceeded the caller's time cap before emitting a crisp final
      refusal, so this proves the state outcome, not the rendered refusal text.

- [x] **Child-session GENTJIN access** - the PM delegated to `oa-internal-researcher`, which
      ran `execute` with `tools.gentjin_discovery({ action: "resolve" })` and reported
      `CHILD-TOOL-OK not_started`. The child reaches GENTJIN tools through the Code Mode
      proxy, exactly as the parent does. `docs/evidence/probe-child-plugintools.txt`.

## Not yet verified (remaining work)

- [ ] Deny-by-default write scope actually blocks PM/QA/security file writes at runtime.
- [ ] `external_directory` vault grant resolves to the intended project vault only.
- [ ] Global installation target and uninstall path (owned-file manifest restore).
- [ ] Security-failure gate (synthetic secret + access-control defect) and injection and
      privacy tests (§13 #8, #9, #11).
- [ ] Live pause/resume, vault curation, and the complete end-to-end chain (§13 #17-#19).
- [ ] Shell allowlist behaviour for redirections, compound commands, interpreters.
- [ ] Non-OpenCode runtimes executed against their real CLIs (format-researched only).
