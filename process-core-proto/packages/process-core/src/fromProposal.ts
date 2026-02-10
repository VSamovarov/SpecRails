import type { ProcessSpecV1 } from "./types.js";

export type ProcessProposalV1 = {
  entry: string;
  lanes: { id: string; label: string }[];
  steps: Array<{
    id: string;
    label: string;
    lane: string;
    next?: string | null;
    branches?: Array<{ when: string; to: string }> | null;
  }>;
  notes?: string;
};

export function proposalToSpec(proposal: ProcessProposalV1): ProcessSpecV1 {
  const lanes: Record<string, string> = {};
  for (const l of proposal.lanes) lanes[l.id] = l.label;

  const steps: ProcessSpecV1["steps"] = {};
  for (const s of proposal.steps) {
    steps[s.id] = {
      label: s.label,
      lane: s.lane,
      ...(s.next ? { next: s.next } : {}),
      ...(s.branches && s.branches.length ? { branches: s.branches } : {}),
    };
  }

  return {
    type: "process",
    version: 1,
    entry: proposal.entry,
    lanes,
    steps,
  };
}
