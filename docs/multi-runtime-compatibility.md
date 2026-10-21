# Multi-Runtime and Multi-Model Compatibility

**Status:** OpenCode verified by real runs; Claude Code, Codex CLI, Gemini CLI, GitHub
Copilot, and ChatGPT/generic are generated from one source and format-researched (not
runtime-executed in this pass).
**Date:** 2026-10-16 (orchestration update 2026-10-21)

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

| Runtime | Agents | Skills | Orchestration delivery | Delegation allowlist |
| --- | --- | --- | --- | --- |
| **OpenCode v2** (verified) | `.opencode/agents/oa-*.md` | `.opencode/skills/<n>/SKILL.md` | `oa-orchestration` skill, loadable by the default `build` agent | instruction-level: no custom primary, so OA emits no `subagent` rule; `delegation_allowlist` is source data |
| **Claude Code** | `.claude/agents/oa-*.md` | `.claude/skills/<n>/SKILL.md` | `.claude/skills/oa-orchestration`, discovered by the default agent | instruction-level; add `disallowedTools`/`permissions` in your own settings for a hard stop |
| **OpenAI Codex** | `.codex/agents/oa-*.toml` | `.agents/skills/<n>/SKILL.md` | `.agents/skills/oa-orchestration` | instruction-level (advisory) |
| **Gemini CLI** | `.gemini/agents/oa-*.md` | `.gemini/skills/<n>/SKILL.md` | `.gemini/skills/oa-orchestration` | instruction-level; Policy Engine `subagent=` can enforce it if you add the rule |
| **GitHub Copilot** | `.github/agents/oa-*.agent.md` | `.github/skills/<n>/SKILL.md` | `.github/skills/oa-orchestration` | instruction-level; no coordinator `agents:` list is emitted |
| **ChatGPT / any LLM** | `prompt-pack/agents/*.md` | `prompt-pack/oa-skills.md` | the pack includes the `oa-orchestration` body | **instruction-only** |

Generated output is not committed; it lives under `integrations/dist/<runtime>/` by
default and is reproducible from source at any time.

## How the orchestrator receives its instructions

`shared/skills/oa-orchestration/SKILL.md` is the only orchestration source. It is exported
as a normal skill for every file-based runtime and included in the prompt pack.

- **Discovery is not injection.** No export modifies a harness's default-agent system
  prompt or project instruction file. The default agent sees the skill's name and
  description and loads the body when the task matches, or when you ask it to. Start with
  "Load `oa-orchestration`, then ..." when you want the gated flow.
- **Verified on OpenCode (2026-10-21).** With an isolated config root, `opencode debug
  agents` listed eight OA subagents and no Project Manager, and the default `build` agent
  declared no `subagent` rule. The exported `oa-orchestration` skill was present and no
  specialist bound it.
- **Not verified.** Claude Code, Codex CLI, Gemini CLI, and Copilot still need a
  runtime-executed check that their default agent discovers and loads the exported skill.

## Delegation enforcement

OA no longer defines a primary agent, so no agent file carries a `subagent` allowlist.
`registry/agents.json` → `delegation_allowlist` is the source of truth, and
`oa-orchestration` instructs the default agent to stay inside it.

- This is **instruction-level** on every currently generated target.
- For a hard stop, apply your harness's own policy to your default agent, then test it.
- Do not describe the allowlist as runtime-enforced without that test.

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
| Delegation allowlist | No | Instruction-level everywhere; apply your harness's own default-agent policy for a hard stop |
| Per-agent permission enforcement | No | Each runtime enforces differently; re-verify per runtime |
| Overgeared Skills plugin tools | No (OpenCode only) | See below |

## Overgeared Skills tools are OpenCode-only

OA relies on Overgeared Skills tools: `gentjin_discovery`, `gentjin_capability`,
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
