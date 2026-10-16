# Roles and Entry Point

OA is one primary coordinator plus seven scoped specialists. The human user is the CEO:
they own requirements and approvals. Only the Project Manager delegates.

## Entry point

Start with **`oa-project-manager`**. It is the single entry point and the only agent
allowed to launch others. Everything else is a subagent.

```bash
opencode run --standalone --auto --agent oa-project-manager "<your request>"
```

On other runtimes, select the equivalent coordinator file (see
`docs/multi-runtime-compatibility.md`).

## Flow

The Project Manager asks the **Librarian** first, reports what it found including an
honest no-match, then fans out to **every agent that applies** and runs the independent
ones concurrently (QA, Cybersecurity, DevOps readiness). No single-specialist default
and no minimum chain. The PM resolves conflicts between agents itself.

The **Git Manager joins the flow only when your request is about git** — commit, push,
branch, PR, sync, revert. Otherwise it stays out and the work goes to whoever fits.
This is flow, not a restriction: OA denies nothing. See `docs/connections.md`.

## The eight roles

| Agent | Mode | Owns | May delegate | May write files | May run shell |
| --- | --- | --- | --- | --- | --- |
| `oa-project-manager` | primary | Scope, acceptance criteria, delegation control, gate enforcement, evidence validation | yes (the other 7 only) | yes | yes |
| `oa-internal-researcher` | subagent | Librarian: retrieval before implementation, and curation of project knowledge | no | yes | yes |
| `oa-external-researcher` | subagent | Researcher: external/third-party evidence — current docs, dependency and API facts | no | yes | yes |
| `oa-full-stack-developer` | subagent | Implementation and architecture within scope | no | yes | yes |
| `oa-qa-engineer` | subagent | Independent verification against acceptance criteria, root-cause investigation | no | yes | yes |
| `oa-cybersecurity` | subagent | Application and data-security review, redacted findings, release-blocking on critical/high | no | yes | yes |
| `oa-devops` | subagent | Deployment readiness, environments, CI/CD, rollback, operational handoff | no | yes | yes |
| `oa-git-manager` | subagent | Authorized Git writes and synchronization only after evidence and scoped authorization | no | yes | yes |

Every role has the same tool access as OpenCode's built-in `build` agent. **The table
above describes what each role is responsible for, not what the runtime permits** —
authority limits are instructions the model follows, not rules the runtime enforces. See
`docs/permissions.md`.

## Separation of duties

These are prompt-level disciplines, not permission rules.

- **QA and Cybersecurity are separate.** QA verifies behavior against acceptance criteria.
  Cybersecurity reviews security and data integrity. Neither one substitutes for the other.
- **The PM plans and delegates rather than implementing.** Its instruction is to route
  application changes and Git operations through specialists.
- **Clarification returns through the PM.** Every specialist is instructed to route
  questions to the coordinator rather than answering the human directly, so a request
  still passes PM validation.
- **Git writes require authorization.** The Git Manager is instructed to mutate only
  after evidence plus a scoped authorization, and never force-push or rewrite history.
- **The PM fans out rather than narrowing.** Every agent that genuinely applies runs,
  and the independent ones run concurrently. Each delegation is a fresh child session,
  so parallel passes cost wall clock far less than the same passes run in sequence.

## Which skills each role reaches

Role skill access is generated from `registry/skill-bindings.json` plus each role's own
`oa-*` skill. Each agent's frontmatter lists `skill` allow rules for exactly those names.
The shared GENTJIN skills (`security-review`, `test-strategy`, `deployment-readiness`,
`git-workflow`, `knowledge-vault`, and so on) are reused by name, never copied.

See `docs/permissions.md` for the full generated rule sets.
