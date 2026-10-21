# OA Implementation TODO (tracking)

## Milestone A - Discovery and foundation (complete)

- [x] Project created at `~/Projects/Overgeared Agents`, git initialized (`main`), no commits made.
- [x] Inspected foundation before changing anything:
  - OpenCode v2.0.28 (V2)
  - Overgeared Skills installed at `~/.config/opencode/` (commit 91bfad7, 24 skills)
  - Overgeared Skills source at `~/Downloads/Overgeared Skills` (matches manifest)
  - Project override `.project-agent.md` -> vault `~/Documents/KnowledgeVault/gentjinskills`
- [x] Source layout: 8 agents (`agents/<role>/agent.md`), 8 OA skills, `shared/`, `registry/`, `integrations/`, `docs/`.
- [x] V2 agent definitions (ordered `permissions` rules, `shell`/`subagent`, no `skills:` field).
- [x] Idempotent exporter + owned-file manifest; project-local `.opencode/` export and `default_agent`.
- [x] Verified connections: agent discovery/load, real subagent delegation, delegation
      allowlist enforcement (holds under `--auto`), OA skill loading, GENTJIN skill reuse.
- [x] All 8 roles discovered and loadable (`docs/evidence/all-roles-discoverable.txt`).

## Milestone B - Delegation and retrieval (complete)

- [x] Handoff contract (§8): `integrations/handoff/validate.mjs` + `schema.json` +
      `test/handoff.test.mjs` (evidence/approval provenance, gate logic). 17 tests.
- [x] Happy path: PM -> internal-researcher (honest `no_relevant_notes`) -> developer ->
      QA (real `npm test`) -> PM. `docs/evidence/milestone-b-happy.txt`.
- [x] Failed-check routing: QA fails on an unmet SPEC criterion -> PM routes back to the
      developer -> QA re-verifies -> PASS, 2 review cycles.
      `docs/evidence/milestone-b-qa-failure.txt`.
- [x] Retrieval-first ordering: no application write before vault lookup; honest no-match.

## Milestone C - Gates and least privilege (partial)

- [x] Cybersecurity and DevOps delegations executed with canonical bodies passed by the PM
      (`docs/evidence/milestone-c-security-devops-git.txt`).
- [x] Git authorization gate: Git Manager performed read-only investigation and made **no
      unauthorized commit** (repo unchanged). `docs/evidence/git-manager-refusal.txt`.
- [ ] Security-failure gate: synthetic secret + access-control defect -> redacted findings,
      release blocked (test #11).
- [ ] Full Git-safety matrix: dirty unrelated files, divergence, conflicts, secret-bearing
      staged paths, changed remotes (test #16).
- [ ] Injection and privacy tests (#8, #9).

## Milestone D - Curation, WIP, control (partial)

- [x] Exporter install/uninstall/`--force` backup/idempotency/conflict refusal (unit).
- [x] Retry bound observed (2 attempts, then re-verify).
- [ ] Live pause/resume demonstration (test #17).
- [ ] Vault curation on completion (test #18) — depends on a vault-root decision.

## Milestone E - Docs (complete)

- [x] `docs/installation.md`, `docs/roles.md`, `docs/limitations.md`,
      `docs/troubleshooting.md`, `docs/testing.md` (full §13 matrix).
- [x] `docs/multi-runtime-compatibility.md` rewritten for all 6 targets + model-agnostic stance.
- [x] `docs/verification.md` corrected with the verified plugin-tool mechanism.
- [x] `package.json` with `npm test` / export scripts.

## Multi-runtime (partial)

- [x] Unified exporter for `opencode|claude|codex|gemini|copilot|chatgpt|generic|all`.
- [x] All targets render; Claude emits `oa-permissions.json`.
- [ ] Runtime-execute and verify each non-OpenCode target against its real CLI.
- [ ] MCP bridge so GENTJIN tools work outside OpenCode (optional).

## Open items (honest)

- [ ] Runtime proof that the orchestrator, QA, and Cybersecurity authority limits hold (currently instruction-level).
- [ ] Tests #6, #8, #9, #11, #15, #16, #17, #18, and the full #19 chain.

## Resolved during this work

- [x] GENTJIN plugin-tool exposure: in OpenCode v2.0.28 the `gentjin_*` tools are **not**
      direct tools for any agent (built-in or custom); they are reachable only through the
      Code Mode `execute` sandbox as `tools.gentjin_*`. OA agents and skills now use that
      path, with direct vault reads as fallback.
