import { nanoid } from "nanoid";
import type { ProcessSpecV1, StepId } from "./types.js";

/**
 * Very small deterministic-ish normalization:
 * - ensure type/version
 * - sort lanes by id
 * - sort steps by id
 * Note: we avoid aggressive rewriting in this prototype.
 */
export function normalizeSpec(spec: ProcessSpecV1): ProcessSpecV1 {
  const lanesSorted: Record<string, string> = {};
  for (const id of Object.keys(spec.lanes).sort()) lanesSorted[id] = spec.lanes[id];

  const stepsSorted: ProcessSpecV1["steps"] = {};
  for (const id of Object.keys(spec.steps).sort()) stepsSorted[id] = spec.steps[id];

  return {
    type: "process",
    version: 1,
    entry: spec.entry,
    lanes: lanesSorted,
    steps: stepsSorted,
  };
}

export function genStepId(prefix = "step"): StepId {
  return `${prefix}_${nanoid(6).replace(/-/g, "_")}`;
}
