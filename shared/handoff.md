# Handoff Contract (OA)

Each assignment/result uses a structured contract. Evidence must be resolvable
to actual runtime-observed tool executions. Approvals must be verifiable scoped
authorizations (never self-declared).

Key fields:
- assignment: task_id, parent_task_id, assigned_agent, objective, acceptance_criteria, project_ref, workspace_ref, baseline_ref (revision+content hashes), read_scope[], write_scope[], context_refs[], skill_names[], risk_level, approval_refs[], limits{max_attempts, context_budget}
- result: status (completed|needs_changes|blocked|failed|cancelled), summary, changed_paths[], evidence_refs[], findings[], unresolved_items[], knowledge_candidates[], proposed_next_role, timestamps, execution_ids
- Verify required fields and status before the orchestrator proceeds. Keep review state separate from implementation state.
- Preserve minimal context; no chain-of-thought, vault dumps, or secrets.
- Reuse GENTJIN gates; never fabricate evidence or approvals.
