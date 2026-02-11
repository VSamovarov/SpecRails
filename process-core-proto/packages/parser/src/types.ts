export type ContractId = string

export type ParserInput = {
  contractId: ContractId
  userText: string
  context?: Record<string, unknown>
  // optional validation issues for repair loop:
  issues?: Array<{ code: string; message: string; path?: string }>
}

export type ParserMeta = {
  provider: string
  model?: string
  contractId: ContractId
  promptVersion?: string
  confidence?: number // 0..1
  assumptions?: string[]
}

export type ParserOutput<T> = {
  ok: boolean
  data?: T
  meta: ParserMeta
  rawText?: string // in case provider returns non-structured
  error?: { message: string; kind: "provider" | "contract" }
}

export interface AiProvider {
  name: string
  runStructured<T>(args: {
    system: string
    prompt: string
    schema: object
  }): Promise<{ data: T; rawText?: string; model?: string }>
}
