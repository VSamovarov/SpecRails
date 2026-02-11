#!/usr/bin/env node
import {
  Parser,
  MockAiProvider,
  GeminiAiProvider,
  GroqAiProvider,
  OpenAiProvider,
  type AiProvider,
} from "../packages/parser/src/index.js"
import { proposalToSpec, validateSpecV1, normalizeSpec, dumpProcessYaml } from "../packages/process-core/src/index.js"

/**
 * Создаёт провайдера на основе переменных окружения
 * Приоритет: GEMINI_API_KEY > GROQ_API_KEY > OPENAI_API_KEY > Mock
 */
function createProvider(): AiProvider {
  const geminiKey = process.env.GEMINI_API_KEY
  const groqKey = process.env.GROQ_API_KEY
  const openaiKey = process.env.OPENAI_API_KEY

  if (geminiKey) {
    console.error("🤖 Using Gemini AI provider")
    return new GeminiAiProvider(geminiKey)
  }

  if (groqKey) {
    console.error("⚡ Using Groq AI provider")
    return new GroqAiProvider(groqKey)
  }

  if (openaiKey) {
    console.error("🧠 Using OpenAI provider")
    return new OpenAiProvider(openaiKey)
  }

  console.error("⚠️  Using Mock provider (no API key found)")
  console.error("    Set GEMINI_API_KEY, GROQ_API_KEY, or OPENAI_API_KEY to use real AI")
  return new MockAiProvider()
}

function printHelp() {
  console.log(
    [
      "Usage:",
      '  node dist/cli.js process:extract "<free text>"',
      "",
      "Commands:",
      "  process:extract   Extract a minimal process DSL from free text via Parser + Validator.",
      "",
      "Environment variables:",
      "  GEMINI_API_KEY    Use Google Gemini AI (recommended for free tier)",
      "  GROQ_API_KEY      Use Groq AI (fast, free tier)",
      "  OPENAI_API_KEY    Use OpenAI GPT (best quality, paid)",
      "",
      "Examples:",
      '  GEMINI_API_KEY=... node dist/cli.js process:extract "School public? yes -> review"',
      '  GROQ_API_KEY=... node dist/cli.js process:extract "School public? yes -> review"',
    ].join("\n")
  )
}

function formatIssues(issues: any[]) {
  return issues.map(i => `- [${i.severity}] ${i.code}: ${i.message}${i.path ? ` (${i.path})` : ""}`).join("\n")
}

async function processExtract(userText: string) {
  const provider = createProvider()
  const parser = new Parser(provider)

  // Attempt 1
  const out1 = await parser.run<any>({
    contractId: "process.v1.extract",
    userText,
  })

  if (!out1.ok || !out1.data) {
    console.error("Parser failed:")
    console.error(out1.error?.message ?? "unknown")
    if (out1.rawText) console.error("Raw:", out1.rawText)
    process.exitCode = 2
    return
  }

  const spec1 = proposalToSpec(out1.data)
  const v1 = validateSpecV1(spec1, { forbidCycles: true })

  if (v1.ok) {
    const normalized = normalizeSpec(spec1)
    console.log(dumpProcessYaml(normalized))
    return
  }

  // Repair loop: attempt 2 with validator issues
  const issuesForModel = v1.issues
    .filter(i => i.severity === "error")
    .map(i => ({
      code: i.code,
      message: i.message,
      path: i.path,
    }))

  const out2 = await parser.run<any>({
    contractId: "process.v1.extract",
    userText,
    issues: issuesForModel,
  })

  if (!out2.ok || !out2.data) {
    console.error("Parser retry failed:")
    console.error(out2.error?.message ?? "unknown")
    console.error("Validator issues:")
    console.error(formatIssues(v1.issues))
    process.exitCode = 3
    return
  }

  const spec2 = proposalToSpec(out2.data)
  const v2 = validateSpecV1(spec2, { forbidCycles: true })

  if (!v2.ok) {
    console.error("Still invalid after retry. Issues:")
    console.error(formatIssues(v2.issues))
    process.exitCode = 4
    return
  }

  const normalized2 = normalizeSpec(spec2)
  console.log(dumpProcessYaml(normalized2))
}

async function main() {
  const [, , cmd, ...rest] = process.argv
  if (!cmd || cmd === "-h" || cmd === "--help") return printHelp()

  if (cmd === "process:extract") {
    const userText = rest.join(" ").trim()
    if (!userText) {
      console.error("Missing free text.")
      process.exitCode = 1
      return
    }
    await processExtract(userText)
    return
  }

  console.error(`Unknown command: ${cmd}`)
  printHelp()
  process.exitCode = 1
}

await main()
