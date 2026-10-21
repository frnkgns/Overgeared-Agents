# Troubleshooting

## An OA agent is not found

- Confirm the export ran: `node integrations/export.mjs --runtime opencode --to project`
  and that `.opencode/agents/oa-*.md` exists.
- Confirm the agent id matches exactly (for example `oa-frontend-developer`, not
  `frontend-developer`).
- `opencode debug agents` and `GET /api/agent` returned `[]` on the tested build. Do not
  trust them; select the agent with a real `opencode run --agent <id>` and check it
  replies.

## `No tool named "gentjin_discovery" is currently available`

Expected in OpenCode v2.0.28. Plugin tools are not direct tools. Reach them through the
Code Mode `execute` tool:

```text
execute { code: 'return await tools.gentjin_discovery({ action: "resolve" })' }
```

If `execute` is unavailable, read the resolved vault path directly and report a genuine
no-match. See `docs/overgeared-skills-compatibility.md`.

## A subagent cannot load a capability body

OpenCode does not expose plugin-registered tools to subagents as direct tools, and a
child may not be able to load a capability body itself. The orchestrator should pass the
canonical instruction body into the child's task packet. This is the intended design,
not a bug.

## Export refuses because of a conflict

OA found a file it does not own, or one you edited after OA wrote it. Inspect the
reported path. To back it up and reclaim it, re-run with `--force`; the original is saved
under `<root>/oa-backups/<timestamp>/`.

## Uninstall left files behind

`--uninstall` removes only files whose content hash still matches the manifest. Files you
edited are intentionally preserved and reported. Delete them yourself only if you are
sure they are disposable.

## `npm test` says the directory is not a file

Node's test runner needs a glob. Use:

```bash
node --test "test/*.test.mjs"
```

## A run hangs or exceeds a time cap

Long multi-delegation runs on slow or free models can exceed a caller's cap. The safety
gates still hold (no unauthorized write), but the final summary may be missing. Re-run, or
split the request. Check the repository state (`git log`, `git status`) to confirm what
actually happened rather than trusting a truncated transcript.

## `skill` permission is denied for a role

Role skill access is generated from `registry/skill-bindings.json`. Add the binding, then
re-run the exporter. Do not hand-edit the generated `.opencode` agent files; they are
overwritten on the next export.
