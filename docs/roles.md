# Roles and Orchestration

OA is eight specialist subagents plus the harness's own default agent acting as the
orchestrator. The human user is the CEO: they own requirements and approvals.
Specialists do not delegate to each other.

## Entry point

Start your harness's default agent and ask it to use OA. It loads the shared
`oa-orchestration` skill, which carries the delegation boundary, ordering, gates, and
evidence rules. There is no custom primary agent to install or select.

```bash
opencode run --standalone --auto "<your request>"
```

On other runtimes, use the equivalent default agent and the exported skill (see
`docs/multi-runtime-compatibility.md`).

## Flow

The orchestrator asks the **Librarian** first, reports what it found including an honest
no-match, then fans out to **every agent that applies** and runs the independent ones
concurrently (QA, Cybersecurity, DevOps readiness). No single-specialist default and no
minimum chain. The orchestrator resolves conflicts between agents itself.

The **Git Manager joins the flow only when your request is about git** — commit, push,
branch, PR, sync, revert. Otherwise it stays out and the work goes to whoever fits.
The orchestrator never starts a git operation you did not ask for. See
`docs/connections.md`.

## The eight specialists

| Agent | Mode | Owns | May delegate | May write files | May run shell |
| --- | --- | --- | --- | --- | --- |
| `oa-internal-researcher` | subagent | Librarian: retrieval before implementation, and curation of project knowledge | no | yes | yes |
| `oa-external-researcher` | subagent | Researcher: external/third-party evidence — current docs, dependency and API facts | no | yes | yes |
| `oa-frontend-developer` | subagent | Frontend architecture, components, responsive design, accessibility, client-side integration | no | yes | yes |
| `oa-backend-developer` | subagent | APIs, data access, server-side business logic, authentication, authorization, integrations | no | yes | yes |
| `oa-qa-engineer` | subagent | Independent verification against acceptance criteria, root-cause investigation | no | yes | yes |
| `oa-cybersecurity` | subagent | Application and data-security review, redacted findings, release-blocking on critical/high | no | yes | yes |
| `oa-devops` | subagent | Deployment readiness, environments, CI/CD, rollback, operational handoff | no | yes | yes |
| `oa-git-manager` | subagent | Authorized Git writes and synchronization only after evidence and scoped authorization | no | yes | yes |

Every role has the same tool access as OpenCode's built-in `build` agent. **The table
above describes what each role is responsible for, not what the runtime permits** —
authority limits are instructions the model follows, not rules the runtime enforces. See
`docs/permissions.md`.

## Delegation allowlist

`registry/agents.json` holds `delegation_allowlist`, the agent ids the orchestrator may
use. It is exported with the source and referenced by `oa-orchestration`. Where the
harness can natively restrict a default agent's delegation, that allowlist can be
enforced; where it cannot, the boundary is instruction-level. Do not describe it as
enforced without testing the specific harness.

## Separation of duties

These are prompt-level disciplines, not permission rules.

- **QA and Cybersecurity are separate.** QA verifies behavior against acceptance criteria.
  Cybersecurity reviews security and data integrity. Neither one substitutes for the other.
- **The orchestrator plans and delegates rather than implementing.** Its instruction is to
  route application changes and Git operations through the specialists.
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
The shared `oa-orchestration` skill is not bound to any specialist: it is installed for
the harness default agent. See `docs/permissions.md` for the full generated rule sets.
