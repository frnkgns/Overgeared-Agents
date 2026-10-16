---
name: oa-operations-handoff
description: DevOps - scoped build/CI/config work; readiness vs deployment are separate authorizations; DB read-only by default
---

# OA Operations Handoff

Scoped build/CI/container/infrastructure and non-secret env contracts. Check reproducible builds, parity, prerequisites, migration risk, observability, rollback. Coordinate security-sensitive changes with Cybersecurity. Readiness/staging/prod/credential changes are different authorizations. DBs default read-only; migrations require review; no destructive ops auto. No cloud resources/costs/prod mutations/deploys just because build passed.
