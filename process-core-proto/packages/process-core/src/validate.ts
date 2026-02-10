import type { ProcessSpecV1, ValidationResult } from "./types.js";
import { issue } from "./errors.js";

export type ValidateOptions = {
  forbidCycles?: boolean; // default true for this prototype
};

export function validateSpecV1(spec: ProcessSpecV1, opts: ValidateOptions = {}): ValidationResult {
  const forbidCycles = opts.forbidCycles ?? true;
  const issues = [];

  if (spec.type !== "process") issues.push(issue("error", "type", "spec.type must be 'process'", "type"));
  if (spec.version !== 1) issues.push(issue("error", "version", "spec.version must be 1", "version"));

  const laneIds = new Set(Object.keys(spec.lanes));
  const stepIds = new Set(Object.keys(spec.steps));

  if (!spec.entry || !stepIds.has(spec.entry)) {
    issues.push(issue("error", "entry_missing", "spec.entry must reference an existing step id", "entry"));
  }

  // per-step checks
  for (const [stepId, s] of Object.entries(spec.steps)) {
    if (!s.label?.trim()) issues.push(issue("error", "label_empty", "step.label is required", `steps.${stepId}.label`, stepId));
    if (!s.lane?.trim()) issues.push(issue("error", "lane_empty", "step.lane is required", `steps.${stepId}.lane`, stepId));
    if (s.lane && !laneIds.has(s.lane)) {
      issues.push(issue("error", "lane_unknown", `Unknown lane '${s.lane}'`, `steps.${stepId}.lane`, stepId));
    }

    const hasNext = typeof s.next === "string" && s.next.length > 0;
    const hasBranches = Array.isArray(s.branches) && s.branches.length > 0;

    if (hasNext && hasBranches) {
      issues.push(issue("error", "next_and_branches", "step cannot have both 'next' and 'branches'", `steps.${stepId}`, stepId));
    }

    if (hasNext && !stepIds.has(s.next!)) {
      issues.push(issue("error", "next_unknown", `Unknown step '${s.next}'`, `steps.${stepId}.next`, stepId));
    }

    if (hasBranches) {
      s.branches!.forEach((b, idx) => {
        if (!b.when?.trim()) {
          issues.push(issue("error", "branch_when_empty", "branch.when is required", `steps.${stepId}.branches[${idx}].when`, stepId));
        }
        if (!b.to?.trim() || !stepIds.has(b.to)) {
          issues.push(issue("error", "branch_to_unknown", `Unknown step '${b.to}'`, `steps.${stepId}.branches[${idx}].to`, stepId));
        }
      });

      // very small heuristic: duplicated when values
      const whens = s.branches!.map(x => x.when.trim().toLowerCase());
      const dup = whens.find((w, i) => whens.indexOf(w) !== i);
      if (dup) issues.push(issue("warn", "branch_when_duplicate", `Duplicated branch condition '${dup}'`, `steps.${stepId}.branches`, stepId));
    }
  }

  // Reachability
  const reachable = new Set<string>();
  const stack = [spec.entry];
  while (stack.length) {
    const cur = stack.pop()!;
    if (reachable.has(cur)) continue;
    reachable.add(cur);
    const s = spec.steps[cur];
    if (!s) continue;
    if (s.next) stack.push(s.next);
    if (s.branches) for (const b of s.branches) stack.push(b.to);
  }
  for (const id of stepIds) {
    if (!reachable.has(id)) issues.push(issue("warn", "unreachable", `Step '${id}' is unreachable from entry`, `steps.${id}`, id));
  }

  // Cycle detection (on directed edges)
  if (forbidCycles) {
    const visiting = new Set<string>();
    const visited = new Set<string>();

    const nextOf = (id: string): string[] => {
      const s = spec.steps[id];
      if (!s) return [];
      const out: string[] = [];
      if (s.next) out.push(s.next);
      if (s.branches) out.push(...s.branches.map(b => b.to));
      return out;
    };

    const dfs = (id: string): boolean => {
      if (visiting.has(id)) return true;
      if (visited.has(id)) return false;
      visiting.add(id);
      for (const n of nextOf(id)) {
        if (dfs(n)) return true;
      }
      visiting.delete(id);
      visited.add(id);
      return false;
    };

    if (spec.entry && dfs(spec.entry)) {
      issues.push(issue("error", "cycle", "Cycle detected; cycles are forbidden in this prototype", "steps"));
    }
  }

  const ok = issues.filter(i => i.severity === "error").length === 0;
  return { ok, issues };
}
