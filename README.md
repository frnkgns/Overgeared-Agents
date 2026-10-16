# Overgeared Agents (OA)

A connected team of specialized agents built on top of GENTJIN Skills. Eight roles with
explicit ownership, PM-only delegation, evidence-based handoffs, independent QA and
security review, and deny-by-default permissions.

The human user is the CEO. `oa-project-manager` is the only entry point and the only
agent that delegates. Seven specialists do scoped work and return results to the PM.

## Quick start

```bash
npm test                                        # unit suite (31 tests)
npm run export                                  # OpenCode -> .opencode/ (project-local)
opencode run --standalone --auto --agent oa-project-manager "<your request>"
```

## One source, many runtimes

`integrations/export.mjs` renders the canonical source into each runtime's native layout:

```bash
node integrations/export.mjs --runtime opencode|claude|codex|gemini|copilot|chatgpt|all
```

| Runtime | Status |
| --- | --- |
| OpenCode v2 | **Runtime-verified** (see `docs/evidence/`) |
| Claude Code, Codex, Gemini CLI, GitHub Copilot, ChatGPT/generic | Generated + structurally tested; **not** runtime-executed yet |

OA pins no model; roles run on whatever model the host is configured with. See
`docs/multi-runtime-compatibility.md`.

## Documentation

- `docs/roles.md` - the eight roles, entry point, separation of duties.
- `docs/installation.md` - install, update, uninstall, per-runtime layout.
- `docs/permissions.md` - generated permission rules.
- `docs/connections.md` - how the connections are wired.
- `docs/architecture.md` - structure and handoff model.
- `docs/testing.md` - the full §13 test matrix with honest coverage status.
- `docs/verification.md` - what was observed at runtime, with evidence files.
- `docs/gentjin-compatibility.md` - GENTJIN integration findings.
- `docs/limitations.md`, `docs/troubleshooting.md` - boundaries and fixes.
- `AGENTS.md` - project guidance. `todo.md` - milestone tracker.
- `work-in-progress/current.md` - current state and next action.

## Honest status

Milestones A, B, and E are complete; C and D are partial. Delegation, skill loading,
allowlist enforcement, retrieval-first ordering, QA-failure routing, and the Git
authorization gate are runtime-verified on OpenCode. The adversarial, capture, and
non-OpenCode paths are not yet exercised. `docs/testing.md` lists each gap explicitly.
