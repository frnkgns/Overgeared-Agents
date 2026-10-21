# OA Permissions

**OA runs at OpenCode's default `build` permission level.** No role denies an action
and no role asks for approval. The eight specialists differ by instruction, skill
binding, and ownership — not by what the runtime will let them do.

## What each role actually declares

Only one kind of rule exists in OA agent source:

- **`skill` allows**, generated from `registry/skill-bindings.json` plus each role's
  own `oa-*` skill. These narrow which skills load, which keeps role context small.
  They never prompt and never block.

There is no OA primary agent, so there is no `subagent` permission rule anywhere.
The orchestrator is the harness default agent, which OA does not define. The delegation
allowlist lives in `registry/agents.json` as data, and `oa-orchestration` instructs the
default agent to respect it. That is instruction-level unless the harness natively
restricts the default agent's delegation. Test the specific harness before claiming
enforcement.

Everything else is absent, and absent means unrestricted.

| Role | Shell | Edit | Web | Question | External dirs | Delegation |
| --- | --- | --- | --- | --- | --- | --- |
| Librarian (`oa-internal-researcher`) | unrestricted | unrestricted | unrestricted | yes | unrestricted | none |
| Researcher (`oa-external-researcher`) | unrestricted | unrestricted | unrestricted | yes | unrestricted | none |
| Frontend Developer | unrestricted | unrestricted | unrestricted | yes | unrestricted | none |
| Backend Developer | unrestricted | unrestricted | unrestricted | yes | unrestricted | none |
| QA | unrestricted | unrestricted | unrestricted | yes | unrestricted | none |
| Cybersecurity | unrestricted | unrestricted | unrestricted | yes | unrestricted | none |
| DevOps | unrestricted | unrestricted | unrestricted | yes | unrestricted | none |
| Git Manager | unrestricted | unrestricted | unrestricted | yes | unrestricted | none |

The only prompt a role can still produce is the one OpenCode itself defines: reading
`*.env` and `*.env.*`, which the base policy marks `ask`.

## Why this is the design

The user-facing complaint was that OA produced more permission requests than actual
building. Two earlier postures were tried and both were wrong for that goal:

1. **Blanket `shell *` ask on five roles.** Every command became a blocking human
   round-trip, and because agent rules load last in V2, a blanket ask also appeared
   to defeat "Allow always" saved approvals.
2. **Deny-by-default with per-role allowlists.** It cut prompts but kept a large,
   fragile rule surface, and it still denied far more than the built-in agent does.

Build-equivalence removes the whole category. There is nothing to tune, nothing to
prompt, and no allowlist that can drift.

## What this costs

Being honest about the trade, because OA's earlier documentation claimed more than
this delivers:

- **Authority limits are instructions, not enforcement.** "The orchestrator never
  implements", "the Git Manager never force-pushes", "the Researcher never touches the
  vault" are now prompt text. A model that ignores them is not stopped by the runtime.
- **Nothing protects a committed secret.** There is no `.env` deny beyond OpenCode's
  own base policy, and no force-push or history-rewrite deny.
- **Multi-runtime enforcement is now advisory everywhere.** See `docs/limitations.md`.

If a hard stop is ever wanted again, OpenCode `policies` are the right mechanism, not
agent permissions: a policy hard-denies *after* rules and saved approvals run, cannot
be overridden by a repository, and never prompts. That gives a real block with none of
the prompt tax:

```jsonc
{ "policies": [{ "action": "tool.use", "resource": "shell:git push --force*", "effect": "deny" }] }
```

## Rule ordering, for when rules return

V2 resolves the **last** matching rule, and every agent starts from a base policy of
`action: "*", resource: "*", effect: allow`. Rules load lower-priority config first,
then global, then agent rules last. Two consequences: an action OA never names is
allowed rather than denied, and a broad rule placed after a narrow one silently
overrides it. Put broad rules before exceptions.

Still ungated by OA, and therefore inherited as *allowed*: `execute` (Code Mode, and
through it the Overgeared Skills `tools.gentjin_*` plugin tools) and `grep`/`glob`, whose
resources are a regex or a pattern rather than a path.
