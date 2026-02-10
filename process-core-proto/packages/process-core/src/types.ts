export type LaneId = string;
export type StepId = string;

export type Branch = {
  when: string;
  to: StepId;
};

export type Step = {
  id: StepId;
  label: string;
  lane: LaneId;
  next?: StepId;
  branches?: Branch[];
};

export type ProcessSpecV1 = {
  type: "process";
  version: 1;
  lanes: Record<LaneId, string>;
  entry: StepId;
  steps: Record<StepId, Omit<Step, "id">>;
};

export type ValidationSeverity = "error" | "warn";

export type ValidationIssue = {
  severity: ValidationSeverity;
  code: string;
  message: string;
  path?: string;     // e.g. "steps.school_is_public.branches[0].to"
  stepId?: StepId;
};

export type ValidationResult = {
  ok: boolean;
  issues: ValidationIssue[];
};
