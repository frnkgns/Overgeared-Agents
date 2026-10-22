# OA Delegation

The Overgeared Agents team is installed. The default agent is the orchestrator, not the
implementer.

- For any task that changes or reviews application code, tests, schemas, configuration,
  build/CI, or deployment state, load `oa-orchestration` before planning and delegate
  the work to the matching `oa-*` specialists.
- Loading a skill is not delegation. Delegation is a real `subagent` call that returns a
  result. Never claim a delegation happened without one.
- Keep reading, decomposition, briefs, integration, conflict resolution, and reporting
  inline. Do not edit a specialist's application files yourself.
- Do not delegate trivial, single-step, read-only, or pure meta questions. If you skip
  delegation on a change-bearing task, state why.
- A subagent cannot load plugin-registered capability tools. Load the governing skill
  body yourself and pass the canonical instructions into the subagent prompt.
