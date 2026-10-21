# OA Work In Progress

**Objective:** Complete OA per `OA-TODO.md` — Milestones B–E and the §13 test suite, plus multi-runtime portability across Claude, Codex, Gemini, ChatGPT, Copilot.
**Updated:** 2026-10-21
**Status:** Milestones A, B, E complete; C and D partial. Developer specialization and default-agent orchestration are merged to `main` via PR #2 (`19cd81e`). Live agent execution is blocked by a provider outage. The OA ↔ Overgeared Skills sync is paused while the user works in the OS repository.

## Done
- **Default-agent orchestration** — removed `oa-project-manager`. Orchestration now lives in the shared `oa-orchestration` skill, installed for the harness default agent and not bound to any specialist. PM wording removed from every role. `registry/agents.json` has `primary: null` and a `delegation_allowlist`; the validator accepts zero primaries (rejects two) and checks the allowlist. The source loader now requires at least one shared skill and exports it to every runtime. 8 agents / 10 OA skills / 18 OpenCode artifacts; 46 tests pass.
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
- Both changes are merged to `main` (`19cd81e`) via PR #2; the feature branch `oa-02-role-split-and-orchestration` is fully merged.
- The project-local `.opencode/` is re-exported and clean: 8 agents, 10 skills, no PM artifact. The global install still contributes the retired PM until refreshed.

## Remaining
- Refresh the global OpenCode install so the retired `oa-project-manager` and `oa-full-stack-developer` stop appearing, then re-run live discovery/delegation when the model endpoint is available.
- Milestone C: security-failure gate (#11), injection (#8), privacy (#9), full Git-safety matrix (#16).
- Milestone D: live pause/resume (#17), vault curation (#18).
- §13: retrieval-outcome discrimination (#6), runtime rework invalidation (#15), full end-to-end chain (#19).
- Runtime proof that the orchestrator, QA, and Cybersecurity authority limits hold (instruction-level under build-equivalence).
- Multi-runtime: execute each non-OpenCode adapter against its real CLI; optional MCP bridge for GENTJIN tools.

## Blockers
- Live gap: GENTJIN plugin tools (`gentjin_*`) are OpenCode-only; other runtimes need an MCP bridge (not built).
- Non-OpenCode targets are not runtime-executed here (format-researched only).

## Completed — Overgeared Skills sync (2026-10-21)
- OS merged to `main` at `91bfad7` and installed globally (legacy `.gentjin` removed, `.overgeared-skills` metadata written, 404 tests passed).
- OA docs/references updated from GENTJIN to Overgeared Skills and merged to `main` at `fdbe111` via PR #3.
- OA global agents refreshed: 8 agents (no PM/full-stack), 10 OA skills. OA tests pass (46/46).
- Sync boundary: OS owns generic skills; OA owns `oa-*` skills. No OA skills were copied into OS.

## Next recommended step
Push `oa-03-overgeared-skills-sync` and open a PR, then verify the sync end-to-end.

## Decisions
- **Developer ownership is split two ways.** Frontend code, client state, accessibility, and presentation belong to `oa-frontend-developer`; APIs, data access, server logic, auth, and integrations belong to `oa-backend-developer`. A full-stack task settles the API contract first, then gets non-overlapping write scopes. Rationale: the single role had no clear owner for either side and UI/UX guidance had nowhere to live. Each developer keeps its own OA skill because the loader requires skills under `agents/<role>/skills/`; a shared skill would have to be duplicated. UI/UX guidance is a separate on-demand skill so routine fixes do not load it.
- OA's working state stays in the repo (`work-in-progress/current.md`, `todo.md`, `docs/`) as the single authoritative copy. Durable project knowledge is also captured in the Overgeared Skills vault at `<user-home>/Documents/KnowledgeVault/overgeared-agents/` (created 2026-10-16; the repo WIP note is the live state, the vault holds continuity and decisions). No existing vault was touched.
- Fixture demonstrations run from a disposable temp directory with OA exported into that fixture's `.opencode/` — no global install, no touching the user's real repos.
- Canonical source keeps OpenCode-V2-shaped agent frontmatter; other runtime adapters translate it. Skill permissions are generated from the registry.
- **GENTJIN plugin-tool exposure (verified, refined):** in OpenCode v2.0.28 the `gentjin_*` tools are **not** direct tools for any agent (built-in `build` or custom OA agents); they are reachable only through the Code Mode `execute` sandbox as `tools.gentjin_*`. `tools: { gentjin_discovery: true }` does not change this, so it is a runtime rule, not an OA permission effect. This supersedes both the 2026-10-07 "not exposed to subagents" note and the earlier "§4 probe (child reached it)" phrasing: the child reached it via the same `execute` proxy.
