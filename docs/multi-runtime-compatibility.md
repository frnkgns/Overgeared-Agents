# Multi-Runtime and Multi-Model Compatibility

**Status:** OpenCode verified by real runs; Claude Code, Codex CLI, Gemini CLI, GitHub
Copilot, and ChatGPT/generic are generated from one source and format-researched (not
runtime-executed in this pass).
**Date:** 2026-10-16

Question: can OA run on OpenCode, Claude Code, OpenAI Codex, Gemini CLI, GitHub Copilot,
and a plain chat model (ChatGPT and others)?

Short answer: **yes, in layers.** Skills port almost for free. Agents need a small
per-target adapter, which `integrations/export.mjs` provides. Runtime *enforcement* does
not port and must be re-verified per runtime; on non-OpenCode runtimes the permission
rules become a fail-closed instruction plus whatever native tool restriction the target
actually supports.

## One source, many targets

`integrations/export.mjs` renders the canonical source into each runtime's native layout:

```
node integrations/export.mjs --runtime opencode|claude|codex|gemini|copilot|chatgpt|all [--to project|global|<dir>]
```

| Runtime | Agents | Skills | Delegation allowlist | Enforcement model |
| --- | --- | --- | --- | --- |
| **OpenCode v2** (verified) | `.opencode/agents/oa-*.md` | `.opencode/skills/<n>/SKILL.md` | `subagent` permission rules (allow `<id>`, deny `*`) | **Enforced**: `permissions` rule list; explicit `deny` holds even under `--auto` |
| **Claude Code** | `.claude/agents/oa-*.md` | `.claude/skills/<n>/SKILL.md` | `tools: Task(a, b, ...)`; `disallowedTools` | Per-agent `tools`/`disallowedTools`; `permissionMode` supported. Path/shell denies need `.claude/oa-permissions.json` merged into `settings.json` |
| **OpenAI Codex** | `.codex/agents/oa-*.toml` | `.agents/skills/<n>/SKILL.md` | capability **reduction** only (`features.*`, `skills.config`) | **Advisory**: agent files cannot override the session sandbox/approval policy |
| **Gemini CLI** | `.gemini/agents/oa-*.md` | `.gemini/skills/<n>/SKILL.md` | `tools:` list; Policy Engine `subagent=` rules | Tool list per agent; sandbox is session-level (`GEMINI_SANDBOX`) |
| **GitHub Copilot** | `.github/agents/oa-*.agent.md` | `.github/skills/<n>/SKILL.md` | `agents: [names]` on the coordinator | Tool list per agent; sandbox/approvals are session-level |
| **ChatGPT / any LLM** | `prompt-pack/agents/*.md` | `prompt-pack/oa-skills.md` | instruction-only | **Instruction-only**: no runtime enforcement |

Generated output is not committed; it lives under `integrations/dist/<runtime>/` by
default and is reproducible from source at any time.

## Model-agnostic by design

OA does not hard-code a model anywhere:

- No agent file, adapter, or registry entry sets `model`.
- OpenCode inherits the user's configured model; Claude Code inherits unless `model` is
  set (OA omits it); Codex/Gemini/Copilot use runtime defaults.
- Role behavior lives in the prompt body and the generated permission rules, not in
  model-specific tuning.
- The `chatgpt` / `generic` target emits a paste-ready prompt pack for any chat surface
  (ChatGPT, Claude.ai, Gemini web, local LLMs) where no filesystem loader exists. It
  states plainly that enforcement there is advisory.

Role-by-role model overrides remain possible through each runtime's own mechanism (for
example a per-agent `model` line), but OA ships none.

## What ports and what does not

| Layer | Ports? | Notes |
| --- | --- | --- |
| Role prompts and skill bodies | Yes | Plain Markdown, target-neutral content |
| SKILL.md skill format | Yes | `name` + `description` frontmatter is shared across all five file-based runtimes |
| Agent frontmatter | Translated | Same intent, different keys per runtime |
| Delegation allowlist | Partly | Native on OpenCode, Claude, Copilot (VS Code); not on Codex/Gemini/chat |
| Per-agent permission enforcement | No | Each runtime enforces differently; re-verify per runtime |
| GENTJIN plugin tools | No (OpenCode only) | See below |

## GENTJIN tools are OpenCode-only

OA relies on GENTJIN tools: `gentjin_discovery`, `gentjin_capability`,
`gentjin_release_notes`. These are OpenCode plugins. In OpenCode v2.0.28 they are **not**
direct tools for any agent; they are reachable only through the Code Mode `execute`
sandbox as `tools.gentjin_*`. Outside OpenCode they do not exist.

Portable fallback: OA agents treat retrieval as (1) `tools.gentjin_*` via `execute` on
OpenCode, else (2) read the resolved vault path directly, else (3) report a genuine
no-match. A future MCP bridge could expose the GENTJIN tools to the other runtimes; that
is not built here.

## Verification status

| Target | Artifacts generated | Structurally tested | Runtime-executed |
| --- | --- | --- | --- |
| OpenCode | yes | yes | **yes** (runs in `docs/evidence/`) |
| Claude Code | yes | yes | no (format-researched) |
| Codex CLI | yes | yes | no (format-researched) |
| Gemini CLI | yes | yes | no (format-researched) |
| GitHub Copilot | yes | yes | no (format-researched) |
| ChatGPT / generic | yes | yes | no (instruction-only) |

Structural tests live in `test/export.test.mjs`. Runtime format sources are recorded in
the research summary captured with this work (Claude Code, Codex, Gemini CLI, ChatGPT,
Copilot — accessed 2026-10-16).
