#!/usr/bin/env node
import {
  Parser,
  MockAiProvider,
  GeminiAiProvider,
  GroqAiProvider,
  OpenAiProvider,
  type AiProvider,
  createRepairer,
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
      '  node dist/cli.js <command> "<arguments>"',
      "",
      "Commands:",
      "  process:extract              Extract a minimal process DSL from free text (old logic)",
      "  process:extract-with-repair  Extract DSL with Repairer if validation fails (NEW!)",
      "",
      "Environment variables:",
      "  GEMINI_API_KEY    Use Google Gemini AI (recommended for free tier)",
      "  GROQ_API_KEY      Use Groq AI (fast, free tier)",
      "  OPENAI_API_KEY    Use OpenAI GPT (best quality, paid)",
      "",
      "Examples:",
      '  GROQ_API_KEY=... node dist/cli.js process:extract-with-repair "User submits -> review"',
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

/**
 * Новая команда: process:extract-with-repair
 *
 * Использует архитектуру Generator + Repairer:
 * 1. Generator (обычный Parser) пытается создать DSL
 * 2. Если не валидно → Repairer исправляет
 */
async function processExtractWithRepair(userText: string) {
  console.error("\n🚀 Starting Generator + Repairer flow...\n")

  const provider = createProvider()
  const parser = new Parser(provider)

  // ============================================
  // Шаг 1: GENERATION (Generator)
  // ============================================
  console.error("📝 Step 1: GENERATION")
  console.error(`   Asking AI to generate DSL from: "${userText}"`)

  const generatedResult = await parser.run<any>({
    contractId: "process.v1.extract",
    userText,
  })

  if (!generatedResult.data) {
    console.error("❌ Generator failed (no data returned):")
    console.error(generatedResult.error?.message ?? "unknown")
    if (generatedResult.rawText) console.error("Raw:", generatedResult.rawText)
    process.exitCode = 2
    return
  }

  const generatedProposal = generatedResult.data

  // Если Generator вернул ok=false но есть data, это значит schema validation failed
  // Это ожидаемо - мы как раз тестируем Repairer!
  if (!generatedResult.ok) {
    console.error("   ⚠️  DSL generated but failed schema validation")
    console.error(`   Error: ${generatedResult.error?.message}`)
  } else {
    console.error("   ✅ DSL generated and passed schema validation")
  }

  // ============================================
  // Шаг 2: VALIDATION
  // ============================================
  console.error("\n🔍 Step 2: VALIDATION")

  const generatedSpec = proposalToSpec(generatedProposal)
  const validation = validateSpecV1(generatedSpec, { forbidCycles: true })

  if (validation.ok) {
    // ✅ Валидация прошла с первого раза!
    console.error("   ✅ DSL is valid! No repair needed.\n")

    const normalized = normalizeSpec(generatedSpec)
    console.log(dumpProcessYaml(normalized))
    return
  }

  // ❌ Не прошло валидацию
  console.error(`   ❌ DSL is invalid (${validation.issues.length} errors)`)
  console.error("\n   Validation errors:")
  validation.issues.forEach(issue => {
    console.error(`   - ${issue.message}${issue.path ? ` at ${issue.path}` : ""}`)
  })

  // ============================================
  // Шаг 3: REPAIR
  // ============================================
  console.error("\n🔧 Step 3: REPAIR")

  // Создаем Repairer с той же моделью (Groq)
  const repairer = createRepairer(
    provider,
    dsl => validateSpecV1(dsl, { forbidCycles: true }),
    {
      maxAttempts: 3,
      verbose: true, // Показывать процесс
    }
  )

  // Конвертируем validation issues в формат для Repairer
  const validationErrors = validation.issues.map(issue => ({
    severity: issue.severity,
    code: issue.code,
    message: issue.message,
    path: issue.path,
    stepId: issue.stepId,
  }))

  // Запускаем repair
  const repairResult = await repairer.repair({
    userInput: userText,
    invalidDSL: generatedSpec,
    validationErrors,
    contractId: "process.v1.extract",
  })

  if (!repairResult.success) {
    // ❌ Repairer не смог исправить
    console.error(`\n❌ Repair failed: ${repairResult.reason}`)
    console.error(`   Attempts used: ${repairResult.attempt}`)

    if (repairResult.validationErrors) {
      console.error("\n   Remaining errors:")
      repairResult.validationErrors.forEach(err => {
        console.error(`   - ${err.message}${err.path ? ` at ${err.path}` : ""}`)
      })
    }

    process.exitCode = 4
    return
  }

  // ✅ Успешно исправлено!
  console.error(`\n✨ DSL successfully repaired in ${repairResult.attempt} attempt(s)!\n`)

  const normalized = normalizeSpec(repairResult.repairedDSL)
  console.log(dumpProcessYaml(normalized))
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

  if (cmd === "process:extract-with-repair") {
    const userText = rest.join(" ").trim()
    if (!userText) {
      console.error("Missing free text.")
      process.exitCode = 1
      return
    }
    await processExtractWithRepair(userText)
    return
  }

  console.error(`Unknown command: ${cmd}`)
  printHelp()
  process.exitCode = 1
}

await main()
