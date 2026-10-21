# OA Connections (Control Flow)

## The default flow

```text
CEO/user
  -> harness default agent (orchestrator, loads oa-orchestration)
       -> Librarian   (retrieval first, always)
            brief or honest no-match
       -> orchestrator reports the brief back
       -> orchestrator fans out to every agent that applies, concurrently
            Frontend Developer | Backend Developer | QA | Cybersecurity | DevOps | Researcher
       -> orchestrator validates all results, resolves conflicts, reports
  -> CEO/user
```

Retrieval is the opening move, not an optional stage. The orchestrator asks the Librarian
first, receives a cited brief or an honest no-match, reports what it found, and only
then brings in the specialists. Reuse a still-valid brief instead of re-running
retrieval.

**Fan out, do not narrow.** There is no single-specialist default and no minimum
chain. If several agents genuinely bear on the task, the orchestrator runs all of them.
The independent ones run concurrently — QA, Cybersecurity, and DevOps readiness review
the same diff and gate neither other, so they belong in one wall-clock pass.

Serialize only real dependencies: developer before QA, QA before the Git Manager,
retrieval before implementation.

When two agents disagree, the orchestrator resolves it as coordinator rather than
re-running both in sequence.

## The Git step

```text
orchestrator -> Git Manager   when the user's own request is about git
                              (commit, push, branch, PR, sync, revert, history, "ship it")
```

The Git Manager is not part of routine flow. For a code change, review, test run, or
release-readiness opinion, route the work to whoever fits and leave Git alone — no
status inspection, no staging "just in case", nothing the user did not ask for.

This is flow, not a restriction. Nothing blocks the Git Manager; OA declares no
permission rules that deny or ask (`docs/permissions.md`). When the request *is* about
git, the Git Manager still wants evidence and a scoped authorization before any write,
and still never force-pushes or rewrites history.

## Notes

- Each result returns to the orchestrator; no specialist-to-specialist direct delegation.
- Use the actual subagent mechanism (V2). Pass a bounded task packet; do not assume
  the child has your context.
- Knowledge capture at milestones and on pause, independent of any push.
- Authority limits are instructions, not enforced permission rules. See
  `docs/permissions.md`.

