# Test Matrix (§13): connections, not just syntax

**Environment:** OpenCode v2.0.28, GENTJIN installed (commit b864378), Windows.
**Fixtures:** disposable temp repo `calc-fixture` (kept outside this repository); no live
credentials, real customer data, production systems, or the user's primary repository were
used.

Status legend: **Runtime** = observed in a real `opencode run` (see `docs/evidence/`);
**Unit** = asserted in `test/*.test.mjs`; **Partial** = one path verified, the other not;
**Not exercised** = designed but no test has been run.

| # | Test (from §13) | Evidence | Status |
| --- | --- | --- | --- |
| 1 | Configuration: exactly 8 specialist subagents, no custom primary | `test/export.test.mjs` (exact 8-agent set, zero `mode: primary`); `docs/evidence/all-roles-discoverable.txt` (8 roles at the time of that run) | **Runtime + Unit** |
| 2 | Export/install: source skills become runtime skills; reinstall idempotent; user files survive | `test/export.test.mjs` (idempotent install, conflict refusal, unowned-file safety, uninstall preserves edits); Milestone A OA+GENTJIN skill load | **Unit + Partial runtime** |
| 3 | Skill binding: each role loads intended GENTJIN skill + OA extension; missing skill is an explicit compatibility failure | `test/export.test.mjs` (generated `skill` allow rules from `registry/skill-bindings.json`); missing-skill failure path not exercised | **Partial** |
| 4 | Delegation: one request creates real specialist invocations returning structured results | `docs/evidence/milestone-b-happy.txt`, `milestone-b-qa-failure.txt` | **Runtime** |
| 5 | Retrieval-first: no application write before honest vault lookup | `milestone-b-happy.txt` (vault glob → 0 matches → honest no-match → then developer) | **Runtime** |
| 6 | Retrieval outcomes distinct (match, irrelevant, empty, inaccessible, malformed index, stale, wrong-project) | — | **Not exercised** |
| 7 | Child-session readiness in the correct writer session; parent evidence insufficient | `test/handoff.test.mjs` (execution/tool provenance required) | **Unit** |
| 8 | Injection: hostile note/site cannot authorize push, reveal secret, or alter permissions | — | **Not exercised** |
| 9 | Privacy: external research carries no vault text, env values, records, or private paths | — | **Not exercised** |
| 10 | QA failure returns to development; Git release stays blocked | `milestone-b-qa-failure.txt` (fail → route → re-verify, 2 cycles) | **Runtime + Partial** |
| 11 | Security failure: synthetic secret + access-control defect → redacted findings, block release | — | **Not exercised** |
| 12 | Evidence: fabricated IDs, self-reported `observed`, nonexecuted tests, stale fingerprints fail gates | `test/handoff.test.mjs` (17 tests) | **Unit** |
| 13 | Authorization: direct invocation, unapproved release, mismatch, stale | `test/export.test.mjs`; `docs/evidence/git-manager-refusal.txt` (no unauthorized commit; repo unchanged) | **Unit + Partial runtime** |
| 14 | Permission: build-equivalence holds, and no role declares a deny or ask | `test/export.test.mjs` (generated rules; validator rejects any deny/ask below the base policy) | **Unit** |
| 15 | Rework: changes after review invalidate evidence and trigger rechecks | `integrations/handoff/schema.json` (fingerprints, `evaluateFinalState`) | **Partial (Unit)** |
| 16 | Git safety: dirty files, divergence, conflicts, secret-bearing staged paths, changed remotes stop unsafe ops without discarding work | `git-manager-refusal.txt` (read-only investigation, no mutation) | **Partial** |
| 17 | Cancellation: pause stops delegation with honest checkpoint; resume refreshes state | `work-in-progress/current.md` (checkpoint exists) | **Partial (artifact only)** |
| 18 | Curation: verified findings reach the correct vault; unverified/raw secrets do not; no duplicate notes | — | **Not exercised** |
| 19 | End-to-end: research → developer → QA → cybersecurity → orchestrator → authorized Git → vault capture | Milestones B and C cover research→dev→QA and security/devops/git-gate; the full chain incl. authorized Git + vault capture is not completed | **Partial** |

## Unit suite

```bash
node --test "test/*.test.mjs"
```

`test/handoff.test.mjs` (17 tests) covers the §8 handoff contract and gate logic.
`test/export.test.mjs` (29 tests) covers source validity, the 8-agent/10-skill set,
generated skill permissions, per-runtime artifact counts and shapes, delegation
allowlists, idempotent install, conflict refusal, `--force` backup, unowned-file safety,
and uninstall that preserves edits.

## Honest gaps

The runtime work proves delegation, skill loading, allowlist enforcement, retrieval-first
behavior, QA-failure routing, and the Git authorization gate. It does **not** yet prove
the adversarial and capture paths: injection resistance (8), privacy of external requests
(9), the security-failure gate (11), retrieval-outcome discrimination (6), evidence
rework invalidation at runtime (15), the full Git-safety matrix (16), live pause/resume
(17), vault curation (18), and the complete end-to-end chain (19). Those are the
remaining verification work and are listed in `todo.md`.
