#!/usr/bin/env node
// OA handoff contract validation (spec section 8).
//
// Dependency-free. Validates the OA-owned assignment/result contract, evidence
// provenance, and approval provenance. This is OA-owned data, not a native tool
// schema, so validation is explicit rather than delegated to the runtime.
//
// The point of this module is to reject the three things a model can fake:
//   1. a bare "observed" claim instead of a resolvable execution reference,
//   2. a self-declared approval the human never gave, and
//   3. a "completed" result with no execution-backed evidence.
//
// Usage:
//   node validate.mjs <handoff.json>
//   node validate.mjs --assignment <assignment.json> --result <result.json>
//   node validate.mjs --stdin   (JSON on stdin)
// Exit code 0 = valid, 1 = invalid, 2 = usage/parse error.

import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..", "..");

export const RESULT_STATUSES = [
  "completed",
  "needs_changes",
  "blocked",
  "failed",
  "cancelled",
];

export const RISK_LEVELS = ["low", "medium", "high"];

export const FINAL_STATES = [
  "implemented_unverified",
  "verified",
  "awaiting_user_approval",
  "committed",
  "pushed",
  "blocked",
];

const DEFAULT_AGENT_IDS = [
  "oa-project-manager",
  "oa-internal-researcher",
  "oa-external-researcher",
  "oa-full-stack-developer",
  "oa-qa-engineer",
  "oa-cybersecurity",
  "oa-devops",
  "oa-git-manager",
];

const PRIMARY_AGENT = "oa-project-manager";

const TASK_ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/;
const SCOPE_UNBOUNDED = ["*", "/", "**", "~", "C:\\", ""];

function readJson(path, fallback) {
  try {
    if (existsSync(path)) return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    /* fall through to fallback */
  }
  return fallback;
}

export function loadKnownAgents() {
  const reg = readJson(resolve(repoRoot, "registry", "agents.json"), null);
  if (reg && Array.isArray(reg.agents) && reg.agents.length) return reg.agents.slice();
  return DEFAULT_AGENT_IDS.slice();
}

export function loadKnownSkills() {
  const bindings = readJson(resolve(repoRoot, "registry", "skill-bindings.json"), null);
  const set = new Set();
  if (bindings && bindings.bindings) {
    for (const list of Object.values(bindings.bindings)) {
      for (const s of list) set.add(s);
    }
  }
  return set;
}

const isPlainObject = (v) =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const isNonEmptyString = (v) => typeof v === "string" && v.trim().length > 0;

function requireString(obj, field, errors, { allowNull = false } = {}) {
  const v = obj[field];
  if (v === undefined) {
    errors.push(`missing required field: ${field}`);
    return false;
  }
  if (allowNull && v === null) return true;
  if (!isNonEmptyString(v)) {
    errors.push(`${field} must be a non-empty string`);
    return false;
  }
  return true;
}

function requireArray(obj, field, errors) {
  const v = obj[field];
  if (v === undefined) {
    errors.push(`missing required field: ${field}`);
    return false;
  }
  if (!Array.isArray(v)) {
    errors.push(`${field} must be an array`);
    return false;
  }
  return true;
}

// An approval is only acceptable when it names a human authorizer and the exact
// action/scope it covers. Anything else is a self-declared approval.
export function validateApprovalRef(ref, index = 0) {
  const errors = [];
  const path = `approval_refs[${index}]`;
  if (typeof ref === "string") {
    errors.push(
      `${path}: string approvals are not proof of human authorization; use an object with approved_by/action/scope/reference/issued_at`,
    );
    return errors;
  }
  if (!isPlainObject(ref)) {
    errors.push(`${path}: must be an object`);
    return errors;
  }
  const approver = ref.approved_by ?? ref.approver ?? ref.by;
  if (!isNonEmptyString(approver)) {
    errors.push(`${path}.approved_by is required`);
  } else if (!["human", "user", "ceo"].includes(String(approver).toLowerCase())) {
    errors.push(
      `${path}.approved_by "${approver}" is not a human authorizer (self-declared approvals are rejected)`,
    );
  }
  requireString(ref, "action", errors);
  requireString(ref, "scope", errors);
  requireString(ref, "reference", errors);
  const issued = ref.issued_at ?? ref.issuedAt;
  if (!isNonEmptyString(issued)) {
    errors.push(`${path}.issued_at is required`);
  } else if (Number.isNaN(Date.parse(issued))) {
    errors.push(`${path}.issued_at must be an ISO-8601 timestamp`);
  }
  return errors;
}

// Evidence must resolve to an execution the runtime actually observed. A string
// claim such as "observed" or "tests passed" is explicitly rejected.
export function validateEvidenceRef(ref, index = 0) {
  const errors = [];
  const path = `evidence_refs[${index}]`;
  if (typeof ref === "string") {
    errors.push(
      `${path}: string evidence ("${ref.slice(0, 40)}") is an assertion, not a resolvable execution reference`,
    );
    return errors;
  }
  if (!isPlainObject(ref)) {
    errors.push(`${path}: must be an object`);
    return errors;
  }
  const execId = ref.execution_id ?? ref.session_id ?? ref.tool_call_id ?? ref.call_id;
  if (!isNonEmptyString(execId)) {
    const claimed = ref.observed ?? ref.source;
    if (claimed !== undefined) {
      errors.push(
        `${path}: self-reported "${String(claimed)}" without an execution_id/tool_call_id is not proof`,
      );
    } else {
      errors.push(
        `${path}: needs an execution identity (execution_id, session_id, or tool_call_id)`,
      );
    }
  }
  requireString(ref, "tool", errors);
  if (ref.exit_status !== undefined && typeof ref.exit_status !== "number") {
    errors.push(`${path}.exit_status must be numeric when present`);
  }
  return errors;
}

export function validateAssignment(a, { knownAgents = loadKnownAgents() } = {}) {
  const errors = [];
  const warnings = [];
  if (!isPlainObject(a)) return { errors: ["assignment must be an object"], warnings };

  requireString(a, "task_id", errors);
  if (isNonEmptyString(a.task_id) && !TASK_ID_RE.test(a.task_id)) {
    errors.push("task_id must be a stable identifier (letters, digits, . _ : -)");
  }

  requireString(a, "parent_task_id", errors, { allowNull: true });

  if (!requireString(a, "assigned_agent", errors)) {
    /* reported */
  } else if (!knownAgents.includes(a.assigned_agent)) {
    errors.push(`assigned_agent "${a.assigned_agent}" is not a known OA agent`);
  } else if (a.assigned_agent === PRIMARY_AGENT) {
    warnings.push(
      "assigned_agent is the primary PM; assignments normally target specialists",
    );
  }

  requireString(a, "objective", errors);

  if (requireArray(a, "acceptance_criteria", errors)) {
    if (a.acceptance_criteria.length === 0) {
      errors.push("acceptance_criteria must contain at least one observable condition");
    }
    a.acceptance_criteria.forEach((c, i) => {
      if (!isNonEmptyString(c)) errors.push(`acceptance_criteria[${i}] must be a non-empty string`);
    });
  }

  requireString(a, "project_ref", errors);
  requireString(a, "workspace_ref", errors);
  requireString(a, "baseline_ref", errors);

  for (const field of ["read_scope", "write_scope", "context_refs", "skill_names", "approval_refs"]) {
    if (requireArray(a, field, errors)) {
      a[field].forEach((v, i) => {
        if (field === "approval_refs") return;
        if (!isNonEmptyString(v)) errors.push(`${field}[${i}] must be a non-empty string`);
      });
    }
  }

  if (Array.isArray(a.write_scope)) {
    for (const s of a.write_scope) {
      if (isNonEmptyString(s) && SCOPE_UNBOUNDED.includes(s.trim())) {
        errors.push(`write_scope "${s}" is unbounded; writes must be scoped to approved paths`);
      }
    }
  }

  if (!requireString(a, "risk_level", errors)) {
    /* reported */
  } else if (!RISK_LEVELS.includes(a.risk_level)) {
    errors.push(`risk_level must be one of ${RISK_LEVELS.join("|")}`);
  }

  if (!isPlainObject(a.limits)) {
    errors.push("limits must be an object");
  } else {
    const max = a.limits.max_attempts;
    if (max === undefined) {
      errors.push("limits.max_attempts is required");
    } else if (!Number.isInteger(max) || max < 1) {
      errors.push("limits.max_attempts must be an integer >= 1");
    } else if (max > 10) {
      warnings.push(`limits.max_attempts ${max} is high; bounded rework starts at 2`);
    }
    if (a.limits.context_budget !== undefined && a.limits.context_budget === null) {
      warnings.push("limits.context_budget is null; consider a concrete budget");
    }
  }

  if (Array.isArray(a.approval_refs)) {
    a.approval_refs.forEach((ref, i) => errors.push(...validateApprovalRef(ref, i)));
  }

  return { errors, warnings };
}

export function validateResult(r, { knownAgents = loadKnownAgents() } = {}) {
  const errors = [];
  const warnings = [];
  if (!isPlainObject(r)) return { errors: ["result must be an object"], warnings };

  if (!requireString(r, "status", errors)) {
    /* reported */
  } else if (!RESULT_STATUSES.includes(r.status)) {
    errors.push(`status must be one of ${RESULT_STATUSES.join("|")}`);
  }

  requireString(r, "summary", errors);

  for (const field of [
    "changed_paths",
    "evidence_refs",
    "findings",
    "unresolved_items",
    "knowledge_candidates",
  ]) {
    if (requireArray(r, field, errors)) {
      r[field].forEach((v, i) => {
        if (field === "evidence_refs" || field === "findings") return;
        if (!isNonEmptyString(v)) errors.push(`${field}[${i}] must be a non-empty string`);
      });
    }
  }

  if (Array.isArray(r.evidence_refs)) {
    r.evidence_refs.forEach((ref, i) => errors.push(...validateEvidenceRef(ref, i)));
  }

  if (requireString(r, "proposed_next_role", errors, { allowNull: true })) {
    if (
      r.proposed_next_role !== null &&
      !knownAgents.includes(r.proposed_next_role)
    ) {
      errors.push(`proposed_next_role "${r.proposed_next_role}" is not a known OA agent`);
    }
  }

  return { errors, warnings };
}

export function validateHandoff(doc, opts = {}) {
  const errors = [];
  const warnings = [];
  if (!isPlainObject(doc)) {
    return { valid: false, errors: ["handoff must be an object"], warnings };
  }
  if (doc.assignment !== undefined) {
    const r = validateAssignment(doc.assignment, opts);
    errors.push(...r.errors);
    warnings.push(...r.warnings);
  }
  if (doc.result !== undefined) {
    const r = validateResult(doc.result, opts);
    errors.push(...r.errors);
    warnings.push(...r.warnings);
  }

  if (isPlainObject(doc.assignment) && isPlainObject(doc.result)) {
    const a = doc.assignment;
    const r = doc.result;
    if (
      r.status === "completed" &&
      Array.isArray(r.evidence_refs) &&
      r.evidence_refs.length === 0 &&
      Array.isArray(a.acceptance_criteria) &&
      a.acceptance_criteria.length > 0
    ) {
      errors.push(
        "a completed result for task with acceptance criteria must carry at least one execution-backed evidence_ref",
      );
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

// Gate evaluation for the accurate final states in section 10. The PM calls this
// instead of hand-waving "done".
export function evaluateFinalState({
  devStatus,
  qaVerdict,
  securityVerdict,
  devopsRequired = false,
  devopsVerdict,
  approvalRefs = [],
  unresolvedHighRisk = false,
} = {}) {
  const blockers = [];
  if (devStatus !== "completed") blockers.push(`development status is ${devStatus}`);
  if (qaVerdict !== "pass") blockers.push(`QA verdict is ${qaVerdict ?? "missing"}`);
  if (securityVerdict !== "pass") blockers.push(`security verdict is ${securityVerdict ?? "missing"}`);
  if (devopsRequired && devopsVerdict !== "pass") {
    blockers.push(`DevOps verdict is ${devopsVerdict ?? "missing"}`);
  }
  if (unresolvedHighRisk) blockers.push("unresolved high-risk findings");
  for (const [i, ref] of approvalRefs.entries()) {
    blockers.push(...validateApprovalRef(ref, i));
  }

  if (blockers.length) return { state: "blocked", blockers };
  if (approvalRefs.length === 0) return { state: "awaiting_user_approval", blockers: [] };
  return { state: "verified", blockers: [] };
}

function main(argv) {
  const args = argv.slice(2);
  let doc = null;

  if (args.includes("--stdin")) {
    doc = JSON.parse(readFileSync(0, "utf8"));
  } else if (args.includes("--assignment") && args.includes("--result")) {
    const aIdx = args.indexOf("--assignment") + 1;
    const rIdx = args.indexOf("--result") + 1;
    doc = {
      assignment: JSON.parse(readFileSync(args[aIdx], "utf8")),
      result: JSON.parse(readFileSync(args[rIdx], "utf8")),
    };
  } else if (args[0] && !args[0].startsWith("--")) {
    doc = JSON.parse(readFileSync(args[0], "utf8"));
  } else {
    console.error("usage: node validate.mjs <handoff.json> | --assignment A.json --result R.json | --stdin");
    process.exit(2);
  }

  const { valid, errors, warnings } = validateHandoff(doc);
  for (const w of warnings) console.log(`  ~ ${w}`);
  for (const e of errors) console.error(`  ! ${e}`);
  console.log(valid ? "handoff: VALID" : "handoff: INVALID");
  process.exit(valid ? 0 : 1);
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  try {
    main(process.argv);
  } catch (err) {
    console.error(`parse error: ${err.message}`);
    process.exit(2);
  }
}
