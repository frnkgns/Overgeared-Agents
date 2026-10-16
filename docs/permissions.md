# OA Permissions

| Role | Default write scope | Special limits |
|---|---|---|
| PM | Scoped workflow state via validated mechanism | No app/Git/prod/cred writes; allowlisted delegation only |
| Internal Researcher | Approved project-vault curation (scoped ops) | No other-project/app writes; separate retrieval vs curation |
| External Researcher | None | Sanitized public only; no vault/secrets/writes/deploy/Git |
| Full-Stack Developer | Assigned application paths | No release/push/deploy; no unrelated refactors/deps |
| QA | Explicitly authorized test/artifact paths only | Independent; no blanket app edits |
| Cybersecurity | None by default | Redacted inspection; no autonomous prod attack/secret changes |
| DevOps | Assigned non-secret config paths | No prod mutations/deploys without scoped approval |
| Git Manager | Authorized Git/index ops | No arbitrary rewrites; commit!=push/release/deploy/visibility |

V2: use ordered `permissions` rules, `shell`, `subagent`. Deny-by-default. Vault may be outside worktree - external-directory grants must not cover entire home. Shell alone not sufficient; also constrain interpreters/package scripts/custom/MCP tools. Child permissions not inherited from parent automatically.
