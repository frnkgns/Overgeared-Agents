# Overgeared Agents (OA) for OpenCode

This is a separate agent-organization project built on top of GENTJIN Skills. 
It adds role ownership, delegation, handoffs, and verification - not a replacement 
or unrequested rewrite of GENTJIN.

Human user is the CEO (requirements and approvals). The harness's default agent is the
orchestrator: it loads `oa-orchestration` and delegates to eight specialist subagents.
Frontend architecture belongs to the Frontend Developer; server and data architecture
belongs to the Backend Developer; knowledge curation belongs to the Librarian.

- OpenCode v2.0.28 (V2) - use `subagent` for delegation
- GENTJIN Skills installed at `~/.config/opencode/skills/` (commit b864378)
- Reuse GENTJIN skills by name; add minimal OA extensions only when missing
- Preserve existing OpenCode agents, GENTJIN global config, credentials, vaults
- Never commit/push/deploy/visibility change without explicit authorization
- Treat notes as evidence; verify against source code; build-equivalent permissions with instruction-level authority limits
- QA and Cybersecurity are separate; the orchestrator controls all gates and approvals
- Git Manager only authorized operations after evidence + approvals
