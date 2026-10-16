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

## The eight roles

| Agent | Mode | Owns | May delegate | May write files | May run shell |
| --- | --- | --- | --- | --- | --- |
| `oa-project-manager` | primary | Scope, acceptance criteria, delegation control, gate enforcement, evidence validation | yes (the other 7 only) | no | no |
| `oa-internal-researcher` | subagent | Retrieval before implementation: project knowledge, conventions, prior decisions | no | no | no |
| `oa-external-researcher` | subagent | External/third-party evidence: current docs, dependency and API facts | no | no | no |
| `oa-full-stack-developer` | subagent | Implementation and architecture within scope | no | yes | ask |
| `oa-qa-engineer` | subagent | Independent verification against acceptance criteria, root-cause investigation | no | no | ask |
| `oa-cybersecurity` | subagent | Application and data-security review, redacted findings, release-blocking on critical/high | no | no | ask (no prod attack) |
| `oa-devops` | subagent | Deployment readiness, environments, CI/CD, rollback, operational handoff | no | no | ask |
| `oa-git-manager` | subagent | Authorized Git writes and synchronization only after evidence and scoped authorization | no | no | ask (guarded) |

## Separation of duties

- **QA and Cybersecurity are separate.** QA verifies behavior against acceptance criteria.
  Cybersecurity reviews security and data integrity. Neither one substitutes for the other.
- **The PM never implements or executes.** It plans, delegates, and validates evidence.
  Its own `edit` and `shell` are denied so the coordinator cannot bypass its specialists.
- **Only the PM holds approvals.** A subagent cannot approve its own work; approvals must
  carry human provenance.
- **Git writes require authorization.** The Git Manager performs mutations only after
  evidence plus a scoped authorization, and hard-denies force-push, history rewrite
  (`git reset --hard`, `git rebase`, `git filter-branch`), and visibility changes.

## Which skills each role reaches

Role skill access is generated from `registry/skill-bindings.json` plus each role's own
`oa-*` skill. Each agent's frontmatter lists `skill` allow rules for exactly those names.
The shared GENTJIN skills (`security-review`, `test-strategy`, `deployment-readiness`,
`git-workflow`, `knowledge-vault`, and so on) are reused by name, never copied.

See `docs/permissions.md` for the full generated rule sets.
