# OA Work In Progress

**Objective:** Complete OA per `OA-TODO.md` — Milestones B–E and the §13 test suite, plus multi-runtime portability across Claude, Codex, Gemini, ChatGPT, Copilot.
**Updated:** 2026-10-25
**Status:** OR-02 Phase 2 is integrated and live-validated in an isolated project-local runtime, but uncommitted and not installed globally. `oa-orchestrator` is now a primary agent with runtime-enforced implementation and delegation restrictions; the UI/UX Designer is the ninth specialist. OA tests pass 60/60, Skills tests 467/467, Skills typecheck clean, OpenCode export 23 artifacts. Global install, commit, push, and merge remain blocked pending explicit approval.

## Phase 2 state (2026-10-25)

- **Live-verified routes** in `~/AppData/Local/Temp/opencode/oa-phase2`: design-only → Librarian → UI/UX; implementation → Librarian → Frontend; combined → Librarian → UI/UX → Frontend → QA. Non-specialist delegation was refused by the guard.
- **Live-verified restriction:** the orchestrator made zero `edit`/`write`/`patch`/`shell`/`bash`/`execute` calls; specialists kept `execute`, `gentjin_*`, `edit`, and `write`.
- **Defect found and fixed:** `integrations/export.mjs` dropped the source `skill * deny` rule, letting the orchestrator load `ui-ux-design` and self-perform. The renderer now preserves source skill denies before generated allows; a regression test asserts the ordering.
- **Deliverable:** `../OR-02-PHASE-2-INTEGRATION-REPORT.md` (workspace root) with live evidence, enforced-vs-instruction matrix, limitations, and the pending global installation plan.


## Done
- **OR-02 Phase 2 — primary orchestrator + runtime enforcement (2026-10-25, uncommitted)** — `oa-orchestrator` is a primary agent with `edit`/`shell`/`execute` denies, `subagent * deny` plus nine allows, and `skill * deny` plus five allows. A `tool.execute.before` guard in Overgeared Skills repeats the implementation-tool and non-specialist-target refusals. The UI/UX Designer became the ninth specialist. Validator exemptions and the exporter's skill-deny ordering were fixed. Live routing in an isolated project-local runtime passed for design-only, implementation, and design→frontend→QA, and non-specialist delegation was blocked. OA 60/60 tests, Skills 467/467, typecheck clean, 23 OpenCode artifacts. See `../OR-02-PHASE-2-INTEGRATION-REPORT.md`.
- **Default-agent orchestration** — removed `oa-project-manager`. Orchestration now lives in the shared `oa-orchestration` skill, installed for the harness default agent and not bound to any specialist. PM wording removed from every role. `registry/agents.json` has `primary: null` and a `delegation_allowlist`; the validator accepts zero primaries (rejects two) and checks the allowlist. The source loader now requires at least one shared skill and exports it to every runtime. 8 agents / 10 OA skills / 18 OpenCode artifacts; 46 tests pass.
- **Default-agent delegation wiring (2026-10-22)** — added "The orchestrator does not implement" to `shared/skills/oa-orchestration/SKILL.md`. The delegation instruction is now a repo artifact (`shared/instructions/oa-delegation.md`) installed by the OpenCode adapter as `oa-delegation.md`, so the OpenCode install ships 21 artifacts; other runtimes keep their existing counts. Users activate it once by adding it to `opencode.jsonc` `instructions`; without that entry OpenCode installs the file but does not load it. OA tests pass 47/47. An earlier live `subagent` call created child session `ses_e9acb02ffffe1xUwabt1WJjO10`, but the provider returned "Free usage limit reached"; dispatch verified, response not, so no live delegation is claimed for this source change. A restart and a live change-bearing task are still required to verify behavior. The source change is committed on `oa-05-default-agent-delegation` (`3042b9d`) and pushed.
- **Developer specialization** — `oa-full-stack-developer` replaced by `oa-frontend-developer` (UI architecture, components, responsive design, accessibility, client-side integration) and `oa-backend-developer` (APIs, data access, server logic, auth, integrations). Added an on-demand `oa-ui-ux` skill instead of injecting design guidance into every task. For full-stack work the orchestrator settles the API contract first, then assigns non-overlapping write scopes. Validator relaxed from exactly one to at least one OA skill per role. Installer prunes retired artifacts while preserving local edits, with two regression tests. (Counts superseded by the orchestrator migration above.)
- **Build-equivalent permissions** — all hand-written `deny`/`ask` rules removed from all eight `agent.md` files. Only registry-generated `skill` allows and the PM `subagent` allowlist remain. Validator now fails the export if any role declares a deny or ask below the OpenCode base policy. Claude/Gemini/Copilot adapters fixed to treat an absent rule as unrestricted (they were stripping tools from every role). Authority limits are now instruction text, not enforcement; OpenCode `policies` are documented as the mechanism for a real hard stop. 40 tests pass.
- **Prompt budget + latency tuning** — narrow per-role shell allowlists above a retained `shell *` ask (43 tests, up from 39); `default_agent` reverted to `build` globally and in this repo; PM given scoped vault writes; PM gained risk-tiered delegation and a concurrent-pass rule. Global `AGENTS.md` slimmed 41,827 → 23,500 bytes (43.8%) with procedure moved into a new `primary-orchestration` skill. See the vault decisions *shell prompt budget and default agent* and *session cost model — why OA is slower*. (Superseded in part by build-equivalent permissions.)
- **Milestone A** — foundation, 8 agents (V2), 8 OA skills, registry, exporter, project-local export; verified by real runs (PM load, real `subagent` delegation, allowlist deny under `--auto`, OA skill load, GENTJIN skill reuse); all 8 roles discovered.
- **§8 handoff contract** — `integrations/handoff/schema.json` + `validate.mjs` + 17 tests.
- **Unified exporter** `integrations/export.mjs` (opencode|claude|codex|gemini|copilot|chatgpt|generic|all) with preflighted install, `--force` backup, uninstall manifest; OpenCode output verified byte-identical to the previously verified artifacts. 14 export tests. **31 tests pass** via `npm test`.
- **Milestone B** — happy path (PM → researcher → dev → QA → PM) and **failed-check routing** (QA fail on SPEC criterion → PM → dev attempt 2 → QA PASS, 2 cycles). Retrieval-first with honest no-match.
- **Milestone C (partial)** — Cybersecurity + DevOps delegations ran with canonical bodies; Git authorization gate held (no unauthorized commit; repo unchanged).
- **Child-session GENTJIN access** — verified: the Internal Researcher reached `tools.gentjin_discovery` via `execute` and returned `CHILD-TOOL-OK not_started`.
- **Project vault** — initialized `<user-home>/Documents/KnowledgeVault/overgeared-agents/` (project memory, 2 ADRs, concept, pattern, session, report, index).
- **Milestone E** — `docs/installation.md`, `roles.md`, `limitations.md`, `troubleshooting.md`, `testing.md` (§13 matrix), rewritten `multi-runtime-compatibility.md`, corrected `verification.md`, `package.json`.

## In progress
- OR-02 Phase 2 changes are staged in both working trees only: OA (`main` at `5bdb34b`) and Skills (`main` at `9c76e4b`). Nothing is committed.
- The project-local `.opencode/` in this repo is re-exported and clean: 10 agents, 10 skills, plus the delegation instruction (23 artifacts).
- The global install is still the pre-Phase-2 set (8 agents, no UI/UX designer, no orchestrator, capability plugin without the guard).

## Remaining
- **Global installation (blocked on approval):** run the plan in `../OR-02-PHASE-2-INTEGRATION-REPORT.md` §8 — back up, export `--to global`, copy the new plugin plus `src/guardrails/orchestrator-guard.mjs`, restart, verify, keep rollback ready.
- Decide separately whether global `default_agent` becomes `oa-orchestrator`; it is user-owned config.
- Re-run the live route set against the *globally installed* plugin once installed, since the isolated run exercised a project-local copy of the guard.
- Milestone C: security-failure gate (#11), injection (#8), privacy (#9), full Git-safety matrix (#16).
- Milestone D: live pause/resume (#17), vault curation (#18).
- §13: retrieval-outcome discrimination (#6), runtime rework invalidation (#15), full end-to-end chain (#19).
- Multi-runtime: execute each non-OpenCode adapter against its real CLI; optional MCP bridge for `gentjin_*` tools.


## Blockers
- Live gap: GENTJIN plugin tools (`gentjin_*`) are OpenCode-only; other runtimes need an MCP bridge (not built).
- Non-OpenCode targets are not runtime-executed here (format-researched only).

## Completed — Overgeared Skills sync (2026-10-21)
- OS merged to `main` at `91bfad7` and installed globally (legacy `.gentjin` removed, `.overgeared-skills` metadata written, 404 tests passed).
- OA docs/references updated from GENTJIN to Overgeared Skills and merged to `main` at `fdbe111` via PR #3.
- OA global agents refreshed: 8 agents (no PM/full-stack), 10 OA skills. OA tests pass (46/46).
- Sync boundary: OS owns generic skills; OA owns `oa-*` skills. No OA skills were copied into OS.

## Next recommended step
No further implementation is pending. The global install and final verification are complete; keep the backup at `<user-home>/Documents/opencode-backup-or02-20261025` until the CEO confirms retention. Commit/push remain unauthorized.

## Decisions
- **The orchestrator is restricted at the tool layer; specialists stay build-equivalent.** The orchestrator's job is coordination, so removing its write surface costs no throughput. V2 permission actions are tool names (`edit`, `shell`, `execute`, `subagent`, `skill`); `write`, `bash`, and `task` are not valid. A `resource: "*"` deny removes a tool from the catalog, which is why `execute` also removes the `gentjin_*` proxy and forced retrieval onto the Librarian. Skill loading is enforced; behavior after loading is not.
- **The guard lives in Skills, not OA.** `src/guardrails/orchestrator-guard.mjs` is pure and unit-tested; the capability plugin calls it so the refusal shares the already-registered `tool.execute.before` hook instead of adding a second plugin.
- **Developer ownership is split two ways.** Frontend code, client state, accessibility, and presentation belong to `oa-frontend-developer`; APIs, data access, server logic, auth, and integrations belong to `oa-backend-developer`. A full-stack task settles the API contract first, then gets non-overlapping write scopes. Rationale: the single role had no clear owner for either side and UI/UX guidance had nowhere to live. Each developer keeps its own OA skill because the loader requires skills under `agents/<role>/skills/`; a shared skill would have to be duplicated. UI/UX guidance is a separate on-demand skill so routine fixes do not load it.
- OA's working state stays in the repo (`work-in-progress/current.md`, `todo.md`, `docs/`) as the single authoritative copy. Durable project knowledge is also captured in the Overgeared Skills vault at `<user-home>/Documents/KnowledgeVault/overgeared-agents/` (created 2026-10-16; the repo WIP note is the live state, the vault holds continuity and decisions). No existing vault was touched.
- Fixture demonstrations run from a disposable temp directory with OA exported into that fixture's `.opencode/` — no global install, no touching the user's real repos.
- Canonical source keeps OpenCode-V2-shaped agent frontmatter; other runtime adapters translate it. Skill permissions are generated from the registry.
- **GENTJIN plugin-tool exposure (verified, refined):** in OpenCode v2.0.28 the `gentjin_*` tools are **not** direct tools for any agent (built-in `build` or custom OA agents); they are reachable only through the Code Mode `execute` sandbox as `tools.gentjin_*`. `tools: { gentjin_discovery: true }` does not change this, so it is a runtime rule, not an OA permission effect. This supersedes both the 2026-10-07 "not exposed to subagents" note and the earlier "§4 probe (child reached it)" phrasing: the child reached it via the same `execute` proxy.
