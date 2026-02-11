import OpenAI from "openai"
import type { AiProvider } from "../types.js"

/**
 * OpenAI API provider
 * Uses GPT-4o-mini model with JSON mode
 */
export class OpenAiProvider implements AiProvider {
  readonly name = "openai"
  private client: OpenAI

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey })
  }

  async runStructured<T>(input: {
    system: string
    prompt: string
    schema: object
  }): Promise<{ data: T; rawText: string; model: string }> {
    try {
      const response = await this.client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: input.system },
          { role: "user", content: input.prompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
      })

      const rawText = response.choices[0].message.content ?? "{}"
      const data = JSON.parse(rawText) as T

      return {
        data,
        rawText,
        model: response.model,
      }
    } catch (error: unknown) {
      const err = error as { status?: number; message?: string }
      if (err.status === 429) {
        throw new Error("Rate limit exceeded. Please try again later.")
      }
      if (err.status === 401) {
        throw new Error("Invalid API key. Check OPENAI_API_KEY environment variable.")
      }
      throw error
    }
  }
}
