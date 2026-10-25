# OA Permissions

OA has two permission postures:

- **The nine specialists run at OpenCode's default `build` level.** No specialist denies an
  action and no specialist asks for approval. They differ by instruction, skill binding,
  and ownership — not by what the runtime will let them do.
- **The primary orchestrator is runtime-restricted.** It cannot edit files, run shell
  commands, or use Code Mode `execute`, and it can delegate only to the nine registered
  specialists.

## What each role declares

### The orchestrator

`agents/orchestrator/agent.md` declares:

| Action | Rule | Effect |
| --- | --- | --- |
| `edit` | `*` | deny — covers `edit`, `write`, and `patch` |
| `shell` | `*` | deny |
| `execute` | `*` | deny — removes Code Mode `execute` and its `gentjin_*` tools |
| `subagent` | `*` | deny — mandatory catch-all |
| `subagent` | the nine specialist ids | allow |
| `skill` | `*` | deny — mandatory catch-all |
| `skill` | `oa-orchestration`, `knowledge-vault`, `project-conventions`, `work-in-progress`, `reporting` | allow |

The order matters. V2 resolves the **last** matching rule, so each deny catch-all comes
before its allowlist. `whollyDisabled` only removes a tool when the last matching rule has
`resource: "*"` and `effect: "deny"`, so the specific allows keep `subagent` and `skill`
available while the catch-all denies every other resource. The orchestrator keeps `read`,
`glob`, `grep`, `question`, `webfetch`, and `websearch` with no rule, which means allowed.

Denying `execute` also removes Code Mode, so the orchestrator cannot call the
`gentjin_*` plugin tools directly. Retrieval and discovery are delegated to the Librarian,
which still has `execute`. That is a deliberate trade, not an oversight.

### The specialists

Each specialist declares only skill rules:

- **`skill` allows**, generated from `registry/skill-bindings.json` plus each role's own
  `oa-*` skill. These narrow which skills load, which keeps role context small. They never
  prompt and never block.

Everything else is absent, and absent means unrestricted. The only prompt a specialist can
still produce is the one OpenCode itself defines: reading `*.env` and `*.env.*`, which the
base policy marks `ask`.

| Role | Shell | Edit | Web | Question | External dirs | Delegation |
| --- | --- | --- | --- | --- | --- | --- |
| Librarian (`oa-internal-researcher`) | unrestricted | unrestricted | unrestricted | yes | unrestricted | none |
| Researcher (`oa-external-researcher`) | unrestricted | unrestricted | unrestricted | yes | unrestricted | none |
| UI/UX Designer (`oa-ui-ux-designer`) | unrestricted | unrestricted | unrestricted | yes | unrestricted | none |
| Frontend Developer | unrestricted | unrestricted | unrestricted | yes | unrestricted | none |
| Backend Developer | unrestricted | unrestricted | unrestricted | yes | unrestricted | none |
| QA | unrestricted | unrestricted | unrestricted | yes | unrestricted | none |
| Cybersecurity | unrestricted | unrestricted | unrestricted | yes | unrestricted | none |
| DevOps | unrestricted | unrestricted | unrestricted | yes | unrestricted | none |
| Git Manager | unrestricted | unrestricted | unrestricted | yes | unrestricted | none |

## Runtime guardrail

The orchestrator's rules are the primary enforcement layer. `src/guardrails/orchestrator-guard.mjs`
in Overgeared Skills adds a `tool.execute.before` check that repeats two decisions:

- a direct `edit`, `write`, `patch`, `shell`, `bash`, or `execute` call by `oa-orchestrator`
  is refused;
- a `subagent` call by `oa-orchestrator` whose target is not one of the nine specialists is
  refused.

The guard does not restrict any other agent. It is defense in depth: if a profile is
loosened, or if a harness exposes a tool the rules did not remove, the hook still refuses
the call. It does not make skill loading or answer-only self-performance enforceable.

## What remains instruction-level

- **Specialist-owned work performed inline.** A model that loads a specialist skill and
  answers the task itself is not stopped by the runtime. The orchestrator prompt and
  `oa-orchestration` forbid it, and the orchestrator's `skill * deny` prevents it from
  loading specialist skills in the first place, but an answer needs no tool call.
- **Git discipline inside a specialist.** The Git Manager's authorization rules and the
  no-force-push rule are prompt text plus the existing Overgeared Skills Git guardrail.
- **Multi-runtime enforcement is advisory outside OpenCode.** See `docs/limitations.md`.

## Why specialists stay build-equivalent

The user-facing complaint was that OA produced more permission requests than actual
building. Two earlier postures were tried and both were wrong for that goal:

1. **Blanket `shell *` ask on five roles.** Every command became a blocking human
   round-trip, and because agent rules load last in V2, a blanket ask also appeared
   to defeat "Allow always" saved approvals.
2. **Deny-by-default with per-role allowlists.** It cut prompts but kept a large,
   fragile rule surface, and it still denied far more than the built-in agent does.

Build-equivalence removes the whole category for the specialists. The orchestrator is the
one role whose job is not to act, so restricting it costs no implementation throughput.

## Rule ordering

V2 resolves the **last** matching rule, and every agent starts from a base policy of
`action: "*", resource: "*", effect: allow`. Rules load lower-priority config first, then
global, then agent rules last. Two consequences: an action OA never names is allowed
rather than denied, and a broad rule placed after a narrow one silently overrides it. Put
broad rules before exceptions.

For a hard stop outside the agent profile, OpenCode `policies` are the right mechanism: a
policy hard-denies *after* rules and saved approvals run, cannot be overridden by a
repository, and never prompts.

```jsonc
{ "policies": [{ "action": "tool.use", "resource": "shell:git push --force*", "effect": "deny" }] }
```

Still ungated by OA for specialists, and therefore inherited as *allowed*: `execute` (Code
Mode, and through it the `gentjin_*` plugin tools) and `grep`/`glob`, whose resources are a
regex or a pattern rather than a path.
