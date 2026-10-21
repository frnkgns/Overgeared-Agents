import assert from "node:assert/strict";
import test from "node:test";

import {
  evaluateFinalState,
  validateApprovalRef,
  validateAssignment,
  validateEvidenceRef,
  validateHandoff,
  validateResult,
} from "../integrations/handoff/validate.mjs";

const validAssignment = () => ({
  task_id: "t-001",
  parent_task_id: null,
  assigned_agent: "oa-frontend-developer",
  objective: "Fix the failing add() test without changing tests.",
  acceptance_criteria: ["node --test passes with no test files modified"],
  project_ref: "overgeared-agents",
  workspace_ref: "fixtures/calc",
  baseline_ref: "git:deadbeef+sha256:abc123",
  read_scope: ["src/**"],
  write_scope: ["src/calc.mjs"],
  context_refs: ["brief:t-001"],
  skill_names: ["project-conventions"],
  risk_level: "low",
  approval_refs: [],
  limits: { max_attempts: 2, context_budget: "8000 tokens" },
});

const validResult = () => ({
  status: "completed",
  summary: "Changed add() to return a+b.",
  changed_paths: ["src/calc.mjs"],
  evidence_refs: [
    { execution_id: "call_abc", tool: "shell", command: "node --test", exit_status: 0 },
  ],
  findings: [],
  unresolved_items: [],
  knowledge_candidates: [],
  proposed_next_role: "oa-qa-engineer",
});

test("accepts a well-formed handoff", () => {
  const { valid, errors } = validateHandoff({
    assignment: validAssignment(),
    result: validResult(),
  });
  assert.equal(valid, true, errors.join("; "));
});

test("rejects an unknown assigned_agent", () => {
  const a = validAssignment();
  a.assigned_agent = "oa-architect";
  const { errors } = validateAssignment(a);
  assert.ok(errors.some((e) => e.includes("not a known OA agent")));
});

test("rejects unbounded write scope", () => {
  const a = validAssignment();
  a.write_scope = ["*"];
  const { errors } = validateAssignment(a);
  assert.ok(errors.some((e) => e.includes("unbounded")));
});

test("requires at least one acceptance criterion", () => {
  const a = validAssignment();
  a.acceptance_criteria = [];
  const { errors } = validateAssignment(a);
  assert.ok(errors.some((e) => e.includes("at least one observable condition")));
});

test("requires bounded max_attempts", () => {
  const a = validAssignment();
  a.limits = { max_attempts: 0 };
  const { errors } = validateAssignment(a);
  assert.ok(errors.some((e) => e.includes("max_attempts")));
});

test("evidence test: a bare 'observed' string is not proof", () => {
  const errors = validateEvidenceRef("observed");
  assert.ok(errors.some((e) => e.includes("not a resolvable execution reference")));
});

test("evidence test: self-reported observed flag without an execution id is rejected", () => {
  const errors = validateEvidenceRef({ tool: "shell", observed: true });
  assert.ok(errors.some((e) => e.includes("self-reported")));
});

test("evidence test: an execution id makes evidence resolvable", () => {
  const errors = validateEvidenceRef({ execution_id: "call_1", tool: "shell" });
  assert.deepEqual(errors, []);
});

test("authorization test: a self-declared agent approval is rejected", () => {
  const errors = validateApprovalRef({
    approved_by: "agent",
    action: "push",
    scope: "origin main",
    reference: "self",
    issued_at: "2026-10-16T00:00:00Z",
  });
  assert.ok(errors.some((e) => e.includes("not a human authorizer")));
});

test("authorization test: a bare string approval is rejected", () => {
  const errors = validateApprovalRef("user approved the push");
  assert.ok(errors.some((e) => e.includes("not proof of human authorization")));
});

test("authorization test: a human scoped approval is accepted", () => {
  const errors = validateApprovalRef({
    approved_by: "human",
    action: "push",
    scope: "origin/oa-1-fix",
    reference: "approvals/2026-10-16.md#push",
    issued_at: "2026-10-16T10:00:00Z",
  });
  assert.deepEqual(errors, []);
});

test("evidence test: completed work with no evidence ref is rejected", () => {
  const r = validResult();
  r.evidence_refs = [];
  const { valid, errors } = validateHandoff({ assignment: validAssignment(), result: r });
  assert.equal(valid, false);
  assert.ok(errors.some((e) => e.includes("execution-backed evidence_ref")));
});

test("result status must be from the allowed set", () => {
  const r = validResult();
  r.status = "done";
  const { errors } = validateResult(r);
  assert.ok(errors.some((e) => e.includes("status must be one of")));
});

test("gate test: missing QA verdict blocks release", () => {
  const { state, blockers } = evaluateFinalState({ devStatus: "completed", securityVerdict: "pass" });
  assert.equal(state, "blocked");
  assert.ok(blockers.some((b) => b.includes("QA verdict")));
});

test("gate test: all gates pass but no human approval awaits approval", () => {
  const { state } = evaluateFinalState({
    devStatus: "completed",
    qaVerdict: "pass",
    securityVerdict: "pass",
  });
  assert.equal(state, "awaiting_user_approval");
});

test("gate test: all gates plus human approval is verified", () => {
  const { state } = evaluateFinalState({
    devStatus: "completed",
    qaVerdict: "pass",
    securityVerdict: "pass",
    approvalRefs: [
      {
        approved_by: "human",
        action: "release",
        scope: "v1.0.0",
        reference: "approvals/1",
        issued_at: "2026-10-16T10:00:00Z",
      },
    ],
  });
  assert.equal(state, "verified");
});

test("gate test: unresolved high-risk findings block release", () => {
  const { state, blockers } = evaluateFinalState({
    devStatus: "completed",
    qaVerdict: "pass",
    securityVerdict: "pass",
    unresolvedHighRisk: true,
  });
  assert.equal(state, "blocked");
  assert.ok(blockers.some((b) => b.includes("high-risk")));
});
