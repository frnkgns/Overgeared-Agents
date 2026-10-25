# OA Delegation

The Overgeared Agents team is installed. The primary `oa-orchestrator` agent is the
orchestrator, not the implementer.

- For any task that changes or reviews application code, tests, schemas, configuration,
  build/CI, or deployment state, load `oa-orchestration` before planning and delegate
  the work to the matching `oa-*` specialist.
- On OpenCode the `oa-orchestrator` agent cannot edit files, run shell commands, or use
  Code Mode `execute`; it can delegate only to the nine registered `oa-*` specialists.
  When you are running as another agent, apply the same boundary by instruction.
- Loading a skill is not delegation. Delegation is a real `subagent` call that returns a
  result. Never claim a delegation happened without one, and never perform a specialist's
  work yourself after loading that specialist's skill.
- Keep reading, decomposition, briefs, integration, conflict resolution, and reporting
  inline. Do not edit a specialist's application files yourself.
- Do not delegate trivial, single-step, read-only, or pure meta questions. If you skip
  delegation on a change-bearing task, state why.
- A subagent cannot load plugin-registered capability tools. Load the governing skill
  body yourself and pass the canonical instructions into the subagent prompt.
