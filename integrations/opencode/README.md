# Integrations: OpenCode

Export OA agents/skills to OpenCode runtime locations.

- For smoke test: use project-local `.opencode/` (agents/, skills/)
- For persistent install: use global config root `~/.config/opencode/` (explicit option only)
- V2 format: `.opencode/agents/*.md` with `mode`, `description`, `permissions`, `skills` as appropriate per installed OpenCode schema
- OA skills exported under `.opencode/skills/<oa-skill>/SKILL.md` (or supported root); reuse Overgeared Skills by reference/name, don't duplicate
- Keep installation idempotent, conflict-aware, reversible. Track owned paths + hashes. Never overwrite unrelated files; preserve Overgeared Skills config/vaults.
- Adapter behavior only where needed (evidence refs, task IDs, handoff validation); reuse existing Overgeared Skills enforcement.
