# Limitations

Honest boundaries. Everything below is either a property of the runtime or a scope
decision in OA, not an oversight.

## Verification status

- **OpenCode v2 is runtime-verified.** Real runs are in `docs/evidence/`.
- **Claude Code, Codex CLI, Gemini CLI, GitHub Copilot, and ChatGPT/generic are
  format-researched and structurally generated, not runtime-executed** in this pass.
  Their adapters are tested for shape (see `test/export.test.mjs`), not for live
  behavior in those CLIs.

## Enforcement does not port

OA declares no `deny` and no `ask` rules (see `docs/permissions.md`). It therefore
enforces nothing on any runtime, and every authority limit in the role definitions is
instruction text that a model may ignore.

Where a hard stop is genuinely required, use OpenCode `policies` rather than agent
permissions. A policy hard-denies after rules and saved approvals run, overrides
project configuration, and never prompts — a real block with no prompt tax:

```jsonc
{ "policies": [{ "action": "tool.use", "resource": "shell:git push --force*", "effect": "deny" }] }
```

Per runtime, if you do choose to add restrictions back:

- **Claude Code** — per-agent `tools`/`disallowedTools` plus `permissionMode`; file and
  shell path denies need the generated `oa-permissions.json` merged into
  `.claude/settings.json`.
- **Codex** — advisory only. Agent files cannot override the session sandbox/approval
  policy.
- **Gemini CLI** — per-agent tool list plus Policy Engine rules; the sandbox itself is
  session-level (`GEMINI_SANDBOX`).
- **GitHub Copilot** — per-agent tool list and coordinator `agents:` allowlist; sandbox
  and approvals are session-level.
- **ChatGPT / any chat model** — instruction-only. No runtime enforcement at all.

## Adapter tool derivation

The Claude, Gemini, and Copilot adapters emit a tool list per agent. Because OA no
longer declares allow rules, an absent rule means **unrestricted**, so each adapter now
includes a tool unless the source explicitly denies it. Previously the adapters granted
tools only on an explicit allow, which silently stripped tools from every role once OA
moved to build-equivalence.

## Delegation allowlist

Native on OpenCode, and on Claude Code (`Task(...)`) and Copilot (VS Code `agents:`).
Codex cannot restrict delegation per agent. Gemini blocks subagent-to-subagent recursion
by rule. Chat models have no allowlist.

## GENTJIN tools

`gentjin_discovery`, `gentjin_capability`, and `gentjin_release_notes` are OpenCode-only
plugins. In OpenCode v2.0.28 they are **not** direct tools for any agent; they are
reachable only through the Code Mode `execute` sandbox as `tools.gentjin_*`. Outside
OpenCode they do not exist. The portable fallback is reading the resolved vault path
directly, then reporting a genuine no-match.

## Scope decisions

- **No MCP bridge.** Exposing GENTJIN tools to non-OpenCode runtimes is possible but not
  built here.
- **No model pinning.** OA sets no `model` anywhere; roles run on whatever model the host
  is configured with.
- **Single-writer assumption.** OA assumes one PM per working tree. Parallel PMs on the
  same files are out of scope.
- **No autonomous approvals, releases, deploys, or history rewrites.** By design.

## Known runtime friction (observed)

- Long multi-delegation runs can exceed a caller's time cap on slow/free models. The
  safety property still held in testing (no unauthorized write occurred), but a crisp
  final summary may not have been emitted before the cap.
- `opencode debug agents` and `GET /api/agent` returned `[]` on the tested build and are
  unreliable for discovery; use a real `run` per agent instead.
