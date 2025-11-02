
export class SpecRailsRuntime {
  async structure(text: string) {
    return {
      extracted: text.split(/\s+/).slice(0, 10),
      note: "Mock result. Replace with LLM call."
    };
  }
}
export const specRails = new SpecRailsRuntime();
