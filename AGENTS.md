# Overgeared Agents (OA) for OpenCode

This is a separate agent-organization project built on top of GENTJIN Skills. 
It adds role ownership, delegation, handoffs, and verification - not a replacement 
or unrequested rewrite of GENTJIN.

Human user is the CEO (requirements and approvals). The Project Manager is the 
primary agent. Seven specialist subagents do scoped work and return results to 
the PM. Architecture initially belongs to Full-Stack Developer; knowledge curation 
initially belongs to Librarian.

- OpenCode v2.0.28 (V2) - use `subagent` for delegation
- GENTJIN Skills installed at `~/.config/opencode/skills/` (commit b864378)
- Reuse GENTJIN skills by name; add minimal OA extensions only when missing
- Preserve existing OpenCode agents, GENTJIN global config, credentials, vaults
- Never commit/push/deploy/visibility change without explicit authorization
- Treat notes as evidence; verify against source code; use deny-by-default
- QA and Cybersecurity are separate; PM controls all gates and approvals
- Git Manager only authorized operations after evidence + approvals
