# OA Architecture

- Built on GENTJIN Skills (installed at `~/.config/opencode/skills/`, commit b864378)
- OpenCode v2.0.28: use V2 agent definitions (`.opencode/agents/*.md`), delegation via `subagent`, permissions per V2 schema
- PM is primary; 7 specialists are subagents; delegation allowlist via PM, specialist→specialist denied by default
- Reuse GENTJIN skills by name; minimal OA skills only for missing behavior
- Handoff contract with resolvable evidence and verifiable approvals
- Runtime enforcement: reuse GENTJIN guards; pass canonical instruction bodies if child tools unavailable; verify child tool access separately from skill loading
- Project-local `.opencode/` for smoke test; global install only explicit
- External projects vaults preserved; use GENTJIN resolver (respect `.project-agent.md`)
