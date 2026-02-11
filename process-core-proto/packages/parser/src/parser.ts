import Ajv from "ajv"
import addFormats from "ajv-formats"
import type { AiProvider, ParserInput, ParserOutput } from "./types.js"
import { loadContract, readJsonSchema } from "./contracts/registry.js"

export class Parser {
  constructor(private provider: AiProvider) {}

  async run<T>(input: ParserInput): Promise<ParserOutput<T>> {
    const contract = loadContract(input.contractId)
    const schema = readJsonSchema(contract.schemaPath)

    const prompt =
      contract.prompt.replace("${userText}", input.userText) +
      (input.issues?.length ? `\n\nValidator issues to fix:\n${JSON.stringify(input.issues, null, 2)}\n` : "")

    try {
      const res = await this.provider.runStructured<T>({ system: contract.system, prompt, schema })

      // Contract validation here (schema-level, not semantic)
      const ajv = new Ajv({ allErrors: true, strict: false })
      addFormats(ajv)
      const validate = ajv.compile(schema as any)
      const ok = validate(res.data)

      if (!ok) {
        const msg = (validate.errors ?? []).map(e => `${e.instancePath || "/"} ${e.message}`).join("; ")
        return {
          ok: false,
          meta: {
            provider: this.provider.name,
            model: res.model,
            contractId: input.contractId,
            promptVersion: contract.promptVersion,
          },
          rawText: res.rawText,
          error: { kind: "contract", message: `Contract schema validation failed: ${msg}` },
        }
      }

      return {
        ok: true,
        data: res.data,
        meta: {
          provider: this.provider.name,
          model: res.model,
          contractId: input.contractId,
          promptVersion: contract.promptVersion,
          confidence: 0.6,
          assumptions: [],
        },
        rawText: res.rawText,
      }
    } catch (e: any) {
      return {
        ok: false,
        meta: { provider: this.provider.name, contractId: input.contractId, promptVersion: contract.promptVersion },
        error: { kind: "provider", message: e?.message ?? "Provider error" },
      }
    }
  }
}
