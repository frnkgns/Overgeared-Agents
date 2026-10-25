import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  DESIGN_SPEC_FIELDS,
  evaluateBoundary,
  evaluateFinalState,
  validateApprovalRef,
  validateAssignment,
  validateDesignSpec,
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

test("boundary: valid assignment+result+passing gates+approval is verified", () => {
  const r = evaluateBoundary({
    assignment: validAssignment(),
    result: validResult(),
    qaVerdict: "pass",
    securityVerdict: "pass",
    approvalRefs: [
      { approved_by: "human", action: "release", scope: "v1", reference: "a/1", issued_at: "2026-10-25T10:00:00Z" },
    ],
  });
  assert.equal(r.valid, true);
  assert.equal(r.finalState, "verified");
  assert.deepEqual(r.errors, []);
});

test("boundary: missing evidence is rejected", () => {
  const r = validResult();
  r.evidence_refs = [];
  const out = evaluateBoundary({
    assignment: validAssignment(),
    result: r,
    qaVerdict: "pass",
    securityVerdict: "pass",
    approvalRefs: [{ approved_by: "human", action: "release", scope: "v1", reference: "a/1", issued_at: "2026-10-25T10:00:00Z" }],
  });
  assert.equal(out.valid, false);
  assert.ok(out.errors.some((e) => e.includes("evidence_ref")));
});

test("boundary: agent-generated approval cannot produce verified", () => {
  const out = evaluateBoundary({
    assignment: validAssignment(),
    result: validResult(),
    qaVerdict: "pass",
    securityVerdict: "pass",
    approvalRefs: [{ approved_by: "agent", action: "release", scope: "v1", reference: "self", issued_at: "2026-10-25T10:00:00Z" }],
  });
  assert.equal(out.finalState, "blocked");
});

test("boundary: QA failure cannot be verified", () => {
  const out = evaluateBoundary({
    assignment: validAssignment(),
    result: validResult(),
    qaVerdict: "fail",
    securityVerdict: "pass",
    approvalRefs: [{ approved_by: "human", action: "release", scope: "v1", reference: "a/1", issued_at: "2026-10-25T10:00:00Z" }],
  });
  assert.equal(out.finalState, "blocked");
  assert.ok(out.blockers.some((b) => b.includes("QA verdict")));
});

test("boundary: security failure cannot be verified", () => {
  const out = evaluateBoundary({
    assignment: validAssignment(),
    result: validResult(),
    qaVerdict: "pass",
    securityVerdict: "fail",
    approvalRefs: [{ approved_by: "human", action: "release", scope: "v1", reference: "a/1", issued_at: "2026-10-25T10:00:00Z" }],
  });
  assert.equal(out.finalState, "blocked");
  assert.ok(out.blockers.some((b) => b.includes("security verdict")));
});

test("boundary: missing approval awaits user approval", () => {
  const out = evaluateBoundary({
    assignment: validAssignment(),
    result: validResult(),
    qaVerdict: "pass",
    securityVerdict: "pass",
    approvalRefs: [],
  });
  assert.equal(out.finalState, "awaiting_user_approval");
});

const __dirname = dirname(fileURLToPath(import.meta.url));
const orchSkill = readFileSync(join(__dirname, "..", "shared", "skills", "oa-orchestration", "SKILL.md"), "utf8");

test("orchestration skill documents the handoff validator invocation", () => {
  assert.match(orchSkill, /integrations\/handoff\/validate\.mjs --boundary/);
  assert.match(orchSkill, /--boundary <handoff\.json>/);
});

test("orchestration skill documents failure behavior for missing evidence", () => {
  assert.match(orchSkill, /do not fabricate JSON/i);
  assert.match(orchSkill, /unverified or blocked/i);
  assert.match(orchSkill, /instruction-driven/i);
});

function validDesignSpec() {
  const spec = {};
  for (const f of DESIGN_SPEC_FIELDS) spec[f] = `value for ${f}`;
  return spec;
}

test("validateDesignSpec accepts a complete spec", () => {
  const errs = validateDesignSpec(validDesignSpec());
  assert.deepEqual(errs, []);
});

test("validateDesignSpec rejects a missing required field", () => {
  const spec = validDesignSpec();
  delete spec.visual_acceptance_criteria;
  const errs = validateDesignSpec(spec);
  assert.ok(errs.some((e) => e.includes("visual_acceptance_criteria")));
});

test("validateAssignment validates design_spec when present", () => {
  const a = validAssignment();
  a.design_spec = validDesignSpec();
  const r = validateAssignment(a);
  assert.deepEqual(r.errors, []);
});

test("validateAssignment rejects an incomplete design_spec", () => {
  const a = validAssignment();
  a.design_spec = { design_objective: "x" };
  const r = validateAssignment(a);
  assert.ok(r.errors.some((e) => e.includes("design_spec.")));
});
