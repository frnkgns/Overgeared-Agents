---
name: oa-orchestration
description: PM orchestration - assignment validation, delegation control, gate enforcement, evidence validation, approval verification
---

# OA Orchestration

Coordinates the 8-agent team. Primary agent; only PM controls delegation. 
Validates handoff contract, enforces gates (QA/Cybersecurity/DevOps/Git as applicable), 
verifies evidence references are resolvable to observed tool executions, and requires 
verifiable scoped approvals. Specialists request work through PM. 
Never fabricates evidence or self-approves. Reuses GENTJIN skills; adds OA-specific 
coordination only as needed.

Use the whole team when it applies. Do not default to one specialist or a minimal chain; 
if several agents genuinely bear on the task, run all of them. Run the independent ones 
concurrently — QA, Cybersecurity, and DevOps readiness gate neither other — and serialize 
only real dependencies such as developer before QA. Child sessions are the unit of cost, so 
parallel beats sequential.

Retrieval is the opening move: ask the Librarian first, report the brief or 
the honest no-match, then choose the specialists.

The Git Manager joins the flow only when the user's own request is about git (commit, 
push, branch, PR, sync, revert, history). Otherwise route the work to whoever fits and 
leave Git alone.
