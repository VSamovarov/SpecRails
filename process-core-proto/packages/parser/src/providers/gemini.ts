import { GoogleGenerativeAI } from "@google/generative-ai"
import type { AiProvider } from "../types.js"

/**
 * Очищает JSON Schema от полей, не поддерживаемых Gemini API
 * Gemini поддерживает только: type, properties, items, required, enum, description
 */
function stripSchemaForGemini(schema: any): any {
  if (typeof schema !== "object" || schema === null) {
    return schema
  }

  if (Array.isArray(schema)) {
    return schema.map(stripSchemaForGemini)
  }

  const allowed = ["type", "properties", "items", "required", "enum", "description"]
  const result: any = {}

  for (const key of allowed) {
    if (!(key in schema)) continue

    if (key === "type") {
      // Если type — массив, берем первый не-null тип
      const typeValue = schema[key]
      if (Array.isArray(typeValue)) {
        result[key] = typeValue.find((t: string) => t !== "null") || typeValue[0]
      } else {
        result[key] = typeValue
      }
    } else if (key === "properties") {
      // Рекурсивно обрабатываем каждое свойство
      const props: any = {}
      for (const [propName, propValue] of Object.entries(schema[key])) {
        props[propName] = stripSchemaForGemini(propValue)
      }
      result[key] = props
    } else if (key === "items") {
      // Рекурсивно обрабатываем items
      result[key] = stripSchemaForGemini(schema[key])
    } else {
      result[key] = schema[key]
    }
  }

  return result
}

/**
 * Google Gemini API provider
 * Uses Gemini 1.5 Flash model with JSON Schema support
 */
export class GeminiAiProvider implements AiProvider {
  readonly name = "gemini"
  private client: GoogleGenerativeAI

  constructor(apiKey: string) {
    this.client = new GoogleGenerativeAI(apiKey)
  }

  async runStructured<T>(input: {
    system: string
    prompt: string
    schema: object
  }): Promise<{ data: T; rawText: string; model: string }> {
    const model = this.client.getGenerativeModel({
      model: "gemini-1.0-pro-latest",
      generationConfig: {
        responseMimeType: "application/json",
        // responseSchema не используем — старые модели не поддерживают
      },
      systemInstruction: input.system,
    })

    try {
      const result = await model.generateContent(input.prompt)
      const response = result.response
      const rawText = response.text()
      const data = JSON.parse(rawText) as T

      return {
        data,
        rawText,
        model: "gemini-1.0-pro-latest",
      }
    } catch (error: unknown) {
      const err = error as { status?: number; message?: string }
      if (err.status === 429) {
        throw new Error("Rate limit exceeded. Please try again later.")
      }
      if (err.status === 401) {
        throw new Error("Invalid API key. Check GEMINI_API_KEY environment variable.")
      }
      throw error
    }
  }
}
