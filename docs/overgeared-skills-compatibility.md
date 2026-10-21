# Overgeared Skills Compatibility Report

**Date:** 2026-10-16
**OpenCode version:** v2.0.28
**Overgeared Skills installed commit:** 91bfad7 (main)
**Overgeared Skills source:** ~/Downloads/Overgeared Skills

## Detection Summary

- OpenCode v2.0.28 (V2 format). Agent definitions use V2 conventions.
- Overgeared Skills is installed globally at `~/.config/opencode/` with 33 installed skills.
- Installed skills: api-design, architecture-review, backend-review, cleanup, compaction, database-review, dependency-review, deployment-readiness, frontend-review, git-workflow, incident-response, integration-review, knowledge-vault, performance-review, project-conventions, refactoring-migration, reporting, requirements-review, review-orchestrator, security-review, skill-authoring, systematic-debugging, test-strategy, work-in-progress
- Overgeared Skills source repo at `~/Downloads/Overgeared Skills` (commit matches manifest)
- Project override: `.project-agent.md` sets `knowledge_root: ~/Documents/KnowledgeVault/gentjinskills`
- Manifest confirms managed files from frnkgns/GentJinSkills.git@main (91bfad7), sourceState clean

## Skill -> OA Role Mapping

| Agent ID | Overgeared Skills (installed) |
|---|---|
| oa-internal-researcher | knowledge-vault, project-conventions, work-in-progress, reporting |
| oa-external-researcher | dependency-review, api-design (applied when relevant) |
| oa-frontend-developer | project-conventions, architecture-review, frontend-review, integration-review, api-design |
| oa-backend-developer | project-conventions, architecture-review, backend-review, api-design, database-review, security-review, integration-review, refactoring-migration |
| oa-qa-engineer | test-strategy, systematic-debugging, integration-review, frontend-review, backend-review, performance-review, cleanup |
| oa-cybersecurity | security-review, dependency-review, api-design, database-review |
| oa-devops | deployment-readiness, dependency-review, incident-response, reporting |
| oa-git-manager | git-workflow, cleanup, reporting |
| harness default agent | `oa-orchestration` (shared skill; not bound to a specialist) |

## Entrypoints & Runtime Notes

- V2 detected; use `subagent` for delegation (not `task`).
- **Overgeared Skills plugin tools are reachable only through Code Mode `execute`.** In OpenCode
  v2.0.28, `gentjin_discovery` / `gentjin_capability` / `gentjin_release_notes` are not
  direct tools for any agent (built-in or custom); call them as
  `tools.gentjin_*(...)` inside `execute`. OA role prompts and skills must follow this,
  or read the resolved vault path directly. Non-OpenCode runtimes need an MCP bridge.
- Child sessions run the same harness, so the `execute` proxy applies there too. Because
  a child may not be able to load a capability body itself, the orchestrator passes canonical instruction
  bodies explicitly when the runtime support is uncertain.
- Native skill discovery: Overgeared Skills in `~/.config/opencode/skills/`. OA skills exported to project-local `.opencode/skills/` for initial test, or global if explicitly requested.
- Agent discovery in V2 uses `.opencode/agents/*.md`.

## Compatibility Gaps / Findings

- Researcher has no single installed Overgeared Skills skill matching external web research; add `oa-external-research` skill without duplicating existing Overgeared Skills skills.
- Memory lookup contract (gentjin_discovery/knowledge-vault, especially `no_relevant_notes`) must be verified against installed implementation.
- Need to verify child-session capability loading vs tool access separately.

## Evidence

- OpenCode: v2.0.28
- Overgeared Skills installed commit: 91bfad7 (manifest + git)
- Skills count: 24 installed under `~/.config/opencode/skills/`
- Source present at ~/Downloads/Overgeared Skills, clean per manifest.
