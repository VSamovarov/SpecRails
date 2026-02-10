import type { AiProvider } from "../types.js";

/**
 * Mock provider: no network. Produces a reasonable ProcessProposalV1 for demos.
 * Also supports a repair-ish behavior: if prompt includes "cycle", avoid cycles.
 */
export class MockAiProvider implements AiProvider {
  name = "mock";

  async runStructured<T>({ system, prompt, schema }: { system: string; prompt: string; schema: object }): Promise<{ data: T; rawText?: string; model?: string }> {
    // extremely naive heuristic-based "AI"
    const text = prompt;

    // Minimal lanes: single lane unless markers exist
    const lanes = [
      { id: "lane_1", label: "Lane 1" }
    ];

    const steps = [
      {
        id: "start",
        label: "Start",
        lane: "lane_1",
        branches: [
          { when: "да", to: "path_yes" },
          { when: "нет", to: "path_no" }
        ]
      },
      { id: "path_yes", label: "Yes path", lane: "lane_1", next: "end" },
      { id: "path_no", label: "No path", lane: "lane_1", next: "end" },
      { id: "end", label: "End", lane: "lane_1" }
    ];

    // If user text contains "потом решение" prefer decision naming
    if (/решен/i.test(text)) {
      steps[3] = { id: "decision", label: "Решение", lane: "lane_1" };
      steps[1].next = "decision";
      steps[2].next = "decision";
      (steps[0] as any).branches[0].to = "path_yes";
      (steps[0] as any).branches[1].to = "path_no";
      (steps[1] as any).label = "Проверка департаментом";
      (steps[2] as any).label = "Автопроверки";
    }

    // If the text seems to have explicit question about school public
    if (/школ/i.test(text) && /гос|государствен/i.test(text)) {
      steps[0] = {
        id: "school_is_public",
        label: "Школа государственная?",
        lane: "lane_1",
        branches: [
          { when: "да", to: steps[1].id },
          { when: "нет", to: steps[2].id }
        ]
      };
    }

    const data: any = { entry: steps[0].id, lanes, steps, notes: "mock output" };
    return { data: data as T, rawText: JSON.stringify(data), model: "mock-0" };
  }
}
