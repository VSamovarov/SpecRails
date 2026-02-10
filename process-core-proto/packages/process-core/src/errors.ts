import type { ValidationIssue, ValidationSeverity } from "./types.js";

export function issue(
  severity: ValidationSeverity,
  code: string,
  message: string,
  path?: string,
  stepId?: string
): ValidationIssue {
  return { severity, code, message, path, stepId };
}
