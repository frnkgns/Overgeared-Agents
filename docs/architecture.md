# OA Architecture

- Built on Overgeared Skills (installed at `~/.config/opencode/skills/`)
- OpenCode v2.1.0: use V2 agent definitions (`.opencode/agents/*.md`), delegation via `subagent`, permissions per V2 schema
- One primary `oa-orchestrator` plus 9 specialist subagents. The orchestrator cannot edit, shell, or use Code Mode `execute`; its generated `subagent` rules deny `*` and allow only the 9 ids, and a `skill * deny` rule keeps specialist skills out of its context. The delegation allowlist is registry data and is enforced on OpenCode by those rules plus the `tool.execute.before` orchestrator guardrail; other runtimes are instruction-level until tested.
- Reuse Overgeared Skills by name; minimal OA skills only for missing behavior
- Handoff contract with resolvable evidence and verifiable approvals
- Runtime enforcement: reuse Overgeared Skills guards; pass canonical instruction bodies if child tools unavailable; verify child tool access separately from skill loading
- Project-local `.opencode/` for smoke test; global install only explicit
- External projects vaults preserved; use Overgeared Skills resolver (respect `.project-agent.md`)
