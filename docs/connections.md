# OA Connections (Control Flow)

CEO/user -> Project Manager
  - PM -> Internal Researcher -> cited research brief -> PM (uses knowledge-vault; reads only relevant notes; no bulk vault read)
  - PM -> External Researcher -> sourced brief -> PM (sanitized public research only)
  - PM -> Git Manager -> preflight/sync -> PM (when needed, authorized)
  - PM -> Full-Stack Developer -> implementation + evidence -> PM
  - PM -> DevOps -> config/build + evidence -> PM (when needed)
  - PM -> QA Engineer -> verdict + defects -> PM; failures route back via PM to responsible
  - PM -> Cybersecurity -> verdict + findings -> PM; failures route back via PM
  - PM -> DevOps readiness (when applicable)
  - PM validates gates + verifiable authorization
  - PM -> Git Manager (commit/push/PR only if requested + authorized + evidence complete)
  - PM -> Internal Researcher for knowledge/WIP curation
  - PM -> CEO/user final evidence-based report

Notes:
- Internal Research first for substantive tasks; reuse valid brief
- Knowledge capture at milestones/pause (independent of push)
- Each result returns to PM; no specialist-to-specialist direct delegation
- Use actual subagent mechanism (V2). Pass bounded task packet; don't assume full context.
