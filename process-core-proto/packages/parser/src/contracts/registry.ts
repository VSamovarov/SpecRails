import fs from "node:fs"
import path from "node:path"

export type ContractDef = {
  id: string
  promptVersion: string
  system: string
  prompt: string
  schemaPath: string
}

export function loadContract(contractId: string): ContractDef {
  // minimal registry: hardcoded mapping for this prototype
  if (contractId !== "process.v1.extract") {
    throw new Error(`Unknown contract: ${contractId}`)
  }

  const root = process.cwd()
  const schemaPath = path.join(root, "contracts", "process.v1.extract.schema.json")
  const system = [
    "You extract a minimal business process into a strict JSON object that matches the provided JSON Schema.",
    "Do NOT invent complex BPMN features. Only lanes, steps, entry, next, branches (XOR).",
    "IDs must be snake_case: /^[a-z][a-z0-9_]*$/",
    "If information is missing, make the smallest reasonable assumption and list it in notes (string).",
  ].join("\n")

  const prompt = [
    "User input (free text):",
    "```",
    "${userText}",
    "```",
    "",
    "Return ONLY the JSON object that matches the schema.",
  ].join("\n")

  return {
    id: contractId,
    promptVersion: "1.0.0",
    system,
    prompt,
    schemaPath,
  }
}

export function readJsonSchema(schemaPath: string): object {
  const buf = fs.readFileSync(schemaPath, "utf-8")
  return JSON.parse(buf)
}
