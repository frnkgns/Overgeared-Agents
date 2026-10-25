# Roles and Orchestration

OA is a primary orchestrator (`oa-orchestrator`) plus nine specialist subagents. The human
user is the CEO: they own requirements and approvals. Specialists do not delegate to each
other.

## Entry point

Select the `oa-orchestrator` primary agent. It loads the shared `oa-orchestration` skill,
which carries the delegation boundary, ordering, gates, and evidence rules. On OpenCode the
orchestrator cannot edit files, run shell commands, or use Code Mode `execute`, and it can
delegate only to the nine registered specialists.

```bash
opencode run --agent oa-orchestrator --auto "<your request>"
```

Set `default_agent` to `oa-orchestrator` to make it the default, or select it with the
agent switcher. On other runtimes, use the equivalent primary agent and the exported skill
(see `docs/multi-runtime-compatibility.md`).

## Flow

The orchestrator asks the **Librarian** first, reports what it found including an honest
no-match, then fans out to **every agent that applies** and runs the independent ones
concurrently (QA, Cybersecurity, DevOps readiness). No single-specialist default and no
minimum chain. The orchestrator resolves conflicts between agents itself.

The **Git Manager joins the flow only when your request is about git** — commit, push,
branch, PR, sync, revert. Otherwise it stays out and the work goes to whoever fits.
The orchestrator never starts a git operation you did not ask for. See
`docs/connections.md`.

## The primary and the nine specialists

| Agent | Mode | Owns | May delegate | May write files | May run shell |
| --- | --- | --- | --- | --- | --- |
| `oa-orchestrator` | primary | Retrieval-first coordination, routing, gates, handoff validation, final reporting | yes, to the nine specialists only | no | no |
| `oa-internal-researcher` | subagent | Librarian: retrieval before implementation, and curation of project knowledge | no | yes | yes |
| `oa-external-researcher` | subagent | Researcher: external/third-party evidence — current docs, dependency and API facts | no | yes | yes |
| `oa-ui-ux-designer` | subagent | UI/UX Designer: visual design, design specifications, design tokens, interaction states, responsive and accessibility requirements, design review | no | yes | yes |
| `oa-frontend-developer` | subagent | Frontend architecture, components, responsive design, accessibility, client-side integration | no | yes | yes |
| `oa-backend-developer` | subagent | APIs, data access, server-side business logic, authentication, authorization, integrations | no | yes | yes |
| `oa-qa-engineer` | subagent | Independent verification against acceptance criteria, root-cause investigation | no | yes | yes |
| `oa-cybersecurity` | subagent | Application and data-security review, redacted findings, release-blocking on critical/high | no | yes | yes |
| `oa-devops` | subagent | Deployment readiness, environments, CI/CD, rollback, operational handoff | no | yes | yes |
| `oa-git-manager` | subagent | Authorized Git writes and synchronization only after evidence and scoped authorization | no | yes | yes |

The nine specialists keep the same tool access as OpenCode's built-in `build` agent. The
orchestrator is the exception: its `edit`, `shell`, and `execute` permissions are denied and
its `subagent` rules form a deny-all-plus-nine-allow allowlist. **The remaining authority
limits are instructions the model follows, not rules the runtime enforces.** See
`docs/permissions.md`.

## Delegation allowlist

`registry/agents.json` holds `delegation_allowlist`, the agent ids the orchestrator may
use. It is exported with the source and referenced by `oa-orchestration`. On OpenCode the
orchestrator's generated `subagent` rules enforce it: `*` is denied and the nine ids are
allowed, so the tool description lists only those agents and a call to any other target is
refused. The `oa-orchestrator` plugin guardrail repeats the check at `tool.execute.before`.
Other runtimes remain instruction-level until tested; do not describe them as enforced.

## Separation of duties

These are prompt-level disciplines, with the orchestrator's tool access enforced as noted
above.

- **QA and Cybersecurity are separate.** QA verifies behavior against acceptance criteria.
  Cybersecurity reviews security and data integrity. Neither one substitutes for the other.
- **The orchestrator plans and delegates rather than implementing.** On OpenCode it cannot
  edit, shell, or execute; by instruction it routes application changes and Git operations
  through the specialists and does not self-perform after loading a specialist skill.
- **Clarification returns through the orchestrator.** Every specialist is instructed to
  route questions back to the coordinator rather than answering the human directly.
- **Git writes require authorization.** The Git Manager is instructed to mutate only
  after evidence plus a scoped authorization, and never force-push or rewrite history.
- **The orchestrator fans out rather than narrowing.** Every agent that genuinely applies
  runs, and the independent ones run concurrently. Each delegation is a fresh child
  session, so parallel passes cost wall clock far less than the same passes run in
  sequence.

## Which skills each role reaches

Role skill access is generated from `registry/skill-bindings.json` plus each role's own
`oa-*` skill. Each agent's frontmatter lists `skill` allow rules for exactly those names.
The orchestrator also carries a `skill * deny` rule, so it cannot load specialist skills.
The shared `oa-orchestration` skill is bound only to the primary orchestrator. See
`docs/permissions.md` for the full generated rule sets.

## Skill bindings (from `registry/skill-bindings.json` plus each role's own `oa-*` skill)

| Agent | Own `oa-*` skill | Bound Overgeared Skills |
| --- | --- | --- |
| `oa-orchestrator` | `oa-orchestration` (shared) | knowledge-vault, project-conventions, work-in-progress, reporting |
| `oa-ui-ux-designer` | `ui-ux-design` | project-conventions, architecture-review, frontend-review, integration-review |
| `oa-internal-researcher` | `oa-vault-research` | knowledge-vault, project-conventions, work-in-progress, reporting |
| `oa-external-researcher` | `oa-external-research` | dependency-review, api-design |
| `oa-frontend-developer` | `oa-frontend-implementation` | project-conventions, architecture-review, frontend-review, integration-review, api-design |
| `oa-backend-developer` | `oa-backend-implementation` | project-conventions, architecture-review, backend-review, api-design, database-review, security-review, integration-review, refactoring-migration |
| `oa-qa-engineer` | `oa-independent-qa` | test-strategy, systematic-debugging, integration-review, frontend-review, backend-review, performance-review, cleanup |
| `oa-cybersecurity` | `oa-security-gate` | security-review, dependency-review, api-design, database-review, integration-review |
| `oa-devops` | `oa-operations-handoff` | deployment-readiness, dependency-review, incident-response, reporting |
| `oa-git-manager` | `oa-git-gate` | git-workflow, cleanup, reporting |
