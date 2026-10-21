# OA Architecture

- Built on GENTJIN Skills (installed at `~/.config/opencode/skills/`, commit b864378)
- OpenCode v2.0.28: use V2 agent definitions (`.opencode/agents/*.md`), delegation via `subagent`, permissions per V2 schema
- No custom primary agent: the harness default agent orchestrates via the shared `oa-orchestration` skill; 8 specialists are subagents; the delegation allowlist is registry data and is instruction-level where the harness cannot enforce it
- Reuse GENTJIN skills by name; minimal OA skills only for missing behavior
- Handoff contract with resolvable evidence and verifiable approvals
- Runtime enforcement: reuse GENTJIN guards; pass canonical instruction bodies if child tools unavailable; verify child tool access separately from skill loading
- Project-local `.opencode/` for smoke test; global install only explicit
- External projects vaults preserved; use GENTJIN resolver (respect `.project-agent.md`)
