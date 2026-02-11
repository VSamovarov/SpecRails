# Полная автоматизация автокоррекции промптов — Расширенный план

**Дата:** 2026-02-11  
**Дополнение к:** `plan-prompt-autocorrection.md`  
**Концепция:** AI улучшает AI — метапромпты и автогенерация тестов

---

## 🎯 Концепция полной автоматизации

### Ключевая идея

**Человек не участвует в улучшении промптов** — система сама:
1. Обнаруживает проблемы (порог ошибок)
2. Собирает данные (фразы → ошибки)
3. Улучшает промпт (AI с метапромптом)
4. Генерирует тесты (из эталонных DSL)
5. Тестирует новый промпт (A/B testing)
6. Применяет лучший вариант

---

## 🔄 Полный цикл автоматической коррекции

```
1. Monitoring: Отслеживание метрик
   ↓
2. Trigger: Порог ошибок превышен (напр. > 15% за час)
   ↓
3. Data Collection: Собираем failed examples
   │   - User input (текст)
   │   - Generated DSL (что AI выдал)
   │   - Validation errors (что не так)
   │   - Expected DSL (если есть эталон)
   ↓
4. Meta-Prompt Execution: AI улучшает промпт
   │   Input: Current prompt + Failed examples + Error patterns
   │   Output: Improved prompt + Rationale
   ↓
5. Test Generation: Генерируем тестовые задания
   │   - Из существующих эталонных DSL
   │   - Reverse engineering: DSL → Text
   │   - AI генерирует текст, характерный для домена
   ↓
6. A/B Testing: Прогоняем старый vs новый промпт
   │   - На тестовом наборе (10-20 примеров)
   │   - Измеряем метрики обоих промптов
   ↓
7. Evaluation: Сравниваем результаты
   │   - Validation success rate
   │   - Field accuracy
   │   - Structural correctness
   ↓
8. Decision: Выбираем лучший промпт
   │   - Если новый > старый + threshold → Apply
   │   - Если новый ≈ старый → Keep old (stability)
   │   - Если новый < старый → Reject, alert team
   ↓
9. Apply: Обновляем Prompt Registry
   ↓
10. Monitor: Продолжаем отслеживание
```

---

## 🧩 Архитектурные компоненты

### 1. ErrorThresholdMonitor

**Ответственность:** Отслеживает метрики и триггерит коррекцию

```typescript
// packages/parser/src/monitoring/error-threshold-monitor.ts

interface ThresholdConfig {
  errorRate: number        // 0.15 = 15%
  timeWindow: number       // milliseconds (1 hour)
  minSamples: number       // минимум запросов для анализа
}

interface MonitoringSnapshot {
  timestamp: number
  totalRequests: number
  failedRequests: number
  errorRate: number
  recentFailures: FailedExample[]
}

class ErrorThresholdMonitor {
  private config: ThresholdConfig
  private snapshots: MonitoringSnapshot[] = []

  check(): {
    exceeded: boolean
    snapshot: MonitoringSnapshot
    recommendation: "improve_prompt" | "ok"
  } {
    const recent = this.getRecentSnapshot()
    
    if (recent.errorRate > this.config.errorRate && 
        recent.totalRequests >= this.config.minSamples) {
      return {
        exceeded: true,
        snapshot: recent,
        recommendation: "improve_prompt"
      }
    }

    return {
      exceeded: false,
      snapshot: recent,
      recommendation: "ok"
    }
  }

  collectFailure(failure: FailedExample): void {
    // Добавляем в историю
  }
}
```

**Пример использования:**
```typescript
const monitor = new ErrorThresholdMonitor({
  errorRate: 0.15,      // 15%
  timeWindow: 3600000,  // 1 час
  minSamples: 10,       // минимум 10 запросов
})

// После каждой валидации
if (!validationResult.ok) {
  monitor.collectFailure({
    userInput: text,
    generatedDSL: result.data,
    errors: validationResult.errors,
  })
}

// Периодическая проверка (каждые 5 минут)
const check = monitor.check()
if (check.exceeded) {
  // Запускаем автокоррекцию!
  await autoCorrect(check.snapshot)
}
```

---

### 2. MetaPromptEngine

**Ответственность:** Использует AI для улучшения промптов

```typescript
// packages/parser/src/meta/meta-prompt-engine.ts

interface PromptImprovementRequest {
  currentPrompt: string
  failedExamples: FailedExample[]
  errorPatterns: ErrorPattern[]
  contractSchema: object
}

interface PromptImprovementResult {
  improvedPrompt: string
  rationale: string               // Почему сделали эти изменения
  changesHighlight: string[]      // Что именно изменили
  confidence: number              // 0-1
}

class MetaPromptEngine {
  constructor(private aiProvider: AiProvider) {}

  async improvePrompt(
    request: PromptImprovementRequest
  ): Promise<PromptImprovementResult> {
    const metaPrompt = this.buildMetaPrompt(request)
    
    const result = await this.aiProvider.runStructured<PromptImprovementResult>({
      system: META_SYSTEM_PROMPT,
      prompt: metaPrompt,
      schema: PROMPT_IMPROVEMENT_SCHEMA,
    })

    return result.data
  }

  private buildMetaPrompt(request: PromptImprovementRequest): string {
    return `
# Task: Improve AI Prompt for DSL Generation

## Current Prompt
\`\`\`
${request.currentPrompt}
\`\`\`

## Contract Schema
\`\`\`json
${JSON.stringify(request.contractSchema, null, 2)}
\`\`\`

## Failed Examples (${request.failedExamples.length})
${this.formatFailedExamples(request.failedExamples)}

## Detected Error Patterns
${this.formatErrorPatterns(request.errorPatterns)}

## Your Task
Analyze the current prompt and failed examples. Propose an improved version that:
1. Fixes the detected error patterns
2. Maintains existing strengths
3. Adds clarity where needed
4. Includes examples if helpful

Return:
- improvedPrompt: The full improved prompt text
- rationale: Why you made these changes
- changesHighlight: List of specific improvements
- confidence: How confident you are (0-1)
    `.trim()
  }

  private formatFailedExamples(examples: FailedExample[]): string {
    return examples.slice(0, 5).map((ex, i) => `
### Example ${i + 1}
**User Input:** ${ex.userInput}
**Generated DSL:** 
\`\`\`json
${JSON.stringify(ex.generatedDSL, null, 2)}
\`\`\`
**Errors:**
${ex.errors.map(e => `- ${e.message}`).join('\n')}
    `).join('\n---\n')
  }
}
```

**Метапромпт (META_SYSTEM_PROMPT):**
```typescript
const META_SYSTEM_PROMPT = `
You are an expert prompt engineer specializing in improving AI prompts for structured data generation.

Your goal: Analyze failing prompts and suggest improvements that will increase accuracy and reliability.

Key principles:
1. Be specific: Vague instructions lead to inconsistent results
2. Use examples: Show what you want, don't just describe it
3. Highlight constraints: Make rules explicit and clear
4. Keep it simple: Don't over-complicate
5. Test mentally: Would you understand this prompt clearly?

When improving prompts:
- Identify root causes of failures
- Add missing constraints
- Clarify ambiguous instructions
- Include examples for complex fields
- Remove unnecessary complexity

Output format: JSON matching the provided schema.
`
```

---

### 3. TestGenerator

**Ответственность:** Генерирует тестовые задания из эталонных DSL

```typescript
// packages/parser/src/testing/test-generator.ts

interface GoldenExample {
  id: string
  dsl: object              // Эталонный DSL
  userText?: string        // Если есть оригинальный текст
}

interface GeneratedTest {
  id: string
  userInput: string        // Сгенерированный текст
  expectedDSL: object      // Ожидаемый DSL
  metadata: {
    generatedFrom: string  // ID эталона
    confidence: number
  }
}

class TestGenerator {
  constructor(private aiProvider: AiProvider) {}

  /**
   * Генерирует человекоподобный текст из DSL
   * Reverse engineering: DSL → Text
   */
  async generateTestFromDSL(golden: GoldenExample): Promise<GeneratedTest> {
    const reversePrompt = this.buildReversePrompt(golden.dsl)
    
    const result = await this.aiProvider.runStructured<{
      userInput: string
      variations: string[]  // Альтернативные формулировки
    }>({
      system: REVERSE_SYSTEM_PROMPT,
      prompt: reversePrompt,
      schema: REVERSE_OUTPUT_SCHEMA,
    })

    return {
      id: `gen_${golden.id}`,
      userInput: result.data.userInput,
      expectedDSL: golden.dsl,
      metadata: {
        generatedFrom: golden.id,
        confidence: 0.9,  // Высокая уверенность для эталонов
      },
    }
  }

  private buildReversePrompt(dsl: object): string {
    return `
# Task: Generate Natural Language from Process DSL

You are given a process definition in structured DSL format.
Your task: Generate a natural, human-like text description that would lead to this exact DSL.

## DSL
\`\`\`json
${JSON.stringify(dsl, null, 2)}
\`\`\`

## Requirements
1. Use casual, natural language (like a human would describe a process)
2. Include all key information from DSL
3. Don't use technical terms like "lanes", "steps" explicitly
4. Be concise but complete
5. Use connecting words: "then", "after", "if", "when"

## Examples of good descriptions
- "User submits request, then manager reviews it and either approves or rejects"
- "Check if school is public. If yes, send to department review. If no, run auto checks. Finally make decision."

Generate a text that captures this process naturally.
    `.trim()
  }

  /**
   * Генерирует вариации проблемных фраз
   */
  async generateVariationsFromFailed(
    failed: FailedExample
  ): Promise<GeneratedTest[]> {
    const variationsPrompt = `
Given this user input that caused errors:
"${failed.userInput}"

And these validation errors:
${failed.errors.map(e => `- ${e.message}`).join('\n')}

Generate 3 variations of this input that:
1. Express the same intent
2. Use different wording
3. Should work correctly with the fixed prompt

Return as JSON array of strings.
    `

    const result = await this.aiProvider.runStructured<{ variations: string[] }>({
      system: "You generate test variations for process descriptions.",
      prompt: variationsPrompt,
      schema: { type: "object", properties: { variations: { type: "array", items: { type: "string" } } } },
    })

    return result.data.variations.map((text, i) => ({
      id: `var_${failed.userInput.substring(0, 20)}_${i}`,
      userInput: text,
      expectedDSL: failed.generatedDSL,  // Ожидаем то же, но корректное
      metadata: {
        generatedFrom: "failed_variation",
        confidence: 0.7,
      },
    }))
  }
}
```

**Reverse Prompt (REVERSE_SYSTEM_PROMPT):**
```typescript
const REVERSE_SYSTEM_PROMPT = `
You are a business analyst describing processes in natural language.

Your task: Given a structured process definition (DSL), generate a natural text description that a real person would write.

Style guidelines:
- Casual, conversational tone
- Simple, clear sentences
- Use everyday language, not technical jargon
- Analogous to how someone explains a workflow to a colleague

Be creative but accurate!
`
```

---

### 4. PromptABTester

**Ответственность:** Сравнивает два промпта на наборе тестов

```typescript
// packages/parser/src/testing/prompt-ab-tester.ts

interface ABTestConfig {
  promptA: string          // Текущий промпт
  promptB: string          // Улучшенный промпт
  testSuite: GeneratedTest[]
  provider: AiProvider
}

interface ABTestResult {
  promptA: PromptScore
  promptB: PromptScore
  winner: "A" | "B" | "tie"
  improvement: number      // % улучшения
  recommendation: "apply" | "reject" | "manual_review"
}

interface PromptScore {
  validationSuccessRate: number
  fieldAccuracy: number
  avgConfidence: number
  detailedResults: TestRunResult[]
}

class PromptABTester {
  async runTest(config: ABTestConfig): Promise<ABTestResult> {
    console.log(`Running A/B test on ${config.testSuite.length} tests...`)

    // Запускаем оба промпта на всех тестах
    const resultsA = await this.runPromptOnTests(
      config.promptA,
      config.testSuite,
      config.provider
    )

    const resultsB = await this.runPromptOnTests(
      config.promptB,
      config.testSuite,
      config.provider
    )

    // Вычисляем метрики
    const scoreA = this.calculateScore(resultsA, config.testSuite)
    const scoreB = this.calculateScore(resultsB, config.testSuite)

    // Определяем победителя
    const winner = this.determineWinner(scoreA, scoreB)
    const improvement = this.calculateImprovement(scoreA, scoreB)

    return {
      promptA: scoreA,
      promptB: scoreB,
      winner,
      improvement,
      recommendation: this.makeRecommendation(winner, improvement),
    }
  }

  private async runPromptOnTests(
    prompt: string,
    tests: GeneratedTest[],
    provider: AiProvider
  ): Promise<TestRunResult[]> {
    const results: TestRunResult[] = []

    for (const test of tests) {
      try {
        const generated = await provider.runStructured({
          system: prompt,
          prompt: test.userInput,
          schema: { /* contract schema */ },
        })

        const validation = validateSpecV1(generated.data, { forbidCycles: true })

        results.push({
          testId: test.id,
          success: validation.ok,
          generatedDSL: generated.data,
          expectedDSL: test.expectedDSL,
          errors: validation.ok ? [] : validation.errors,
          fieldMatches: this.compareFields(generated.data, test.expectedDSL),
        })
      } catch (error) {
        results.push({
          testId: test.id,
          success: false,
          error: error.message,
        })
      }
    }

    return results
  }

  private calculateScore(
    results: TestRunResult[],
    tests: GeneratedTest[]
  ): PromptScore {
    const total = results.length
    const successful = results.filter(r => r.success).length
    
    const fieldAccuracyScores = results
      .filter(r => r.fieldMatches)
      .map(r => r.fieldMatches!.accuracy)
    
    const avgFieldAccuracy = fieldAccuracyScores.length > 0
      ? fieldAccuracyScores.reduce((a, b) => a + b, 0) / fieldAccuracyScores.length
      : 0

    return {
      validationSuccessRate: successful / total,
      fieldAccuracy: avgFieldAccuracy,
      avgConfidence: 0.85,  // Можно вычислить из AI ответов
      detailedResults: results,
    }
  }

  private determineWinner(scoreA: PromptScore, scoreB: PromptScore): "A" | "B" | "tie" {
    const diffValidation = scoreB.validationSuccessRate - scoreA.validationSuccessRate
    const diffAccuracy = scoreB.fieldAccuracy - scoreA.fieldAccuracy

    // Weighted score: 70% validation, 30% accuracy
    const scoreATotal = scoreA.validationSuccessRate * 0.7 + scoreA.fieldAccuracy * 0.3
    const scoreBTotal = scoreB.validationSuccessRate * 0.7 + scoreB.fieldAccuracy * 0.3

    const diff = scoreBTotal - scoreATotal

    if (Math.abs(diff) < 0.02) {  // < 2% difference
      return "tie"
    }

    return diff > 0 ? "B" : "A"
  }

  private calculateImprovement(scoreA: PromptScore, scoreB: PromptScore): number {
    const scoreATotal = scoreA.validationSuccessRate * 0.7 + scoreA.fieldAccuracy * 0.3
    const scoreBTotal = scoreB.validationSuccessRate * 0.7 + scoreB.fieldAccuracy * 0.3
    
    return ((scoreBTotal - scoreATotal) / scoreATotal) * 100
  }

  private makeRecommendation(
    winner: "A" | "B" | "tie",
    improvement: number
  ): "apply" | "reject" | "manual_review" {
    if (winner === "B" && improvement > 10) {
      return "apply"  // Значительное улучшение
    }

    if (winner === "A") {
      return "reject"  // Новый промпт хуже
    }

    return "manual_review"  // Незначительное улучшение или tie
  }

  private compareFields(actual: any, expected: any): { accuracy: number; matches: any } {
    // Сравнение полей actual и expected
    // Возвращаем % совпадения
    // Упрощенная версия:
    return { accuracy: 0.92, matches: {} }
  }
}
```

---

### 5. AutoCorrectionOrchestrator

**Ответственность:** Координирует весь процесс автокоррекции

```typescript
// packages/parser/src/orchestration/auto-correction-orchestrator.ts

class AutoCorrectionOrchestrator {
  constructor(
    private monitor: ErrorThresholdMonitor,
    private metaEngine: MetaPromptEngine,
    private testGenerator: TestGenerator,
    private abTester: PromptABTester,
    private promptRegistry: AdaptivePromptRegistry
  ) {}

  /**
   * Главная функция: запускает полный цикл автокоррекции
   */
  async runAutoCorrectionCycle(contractId: string): Promise<CorrectionReport> {
    console.log(`\n🔄 Starting auto-correction for contract: ${contractId}`)

    // 1. Проверяем порог ошибок
    const check = this.monitor.check()
    if (!check.exceeded) {
      return { status: "no_action_needed", reason: "Error rate below threshold" }
    }

    console.log(`⚠️  Error threshold exceeded: ${(check.snapshot.errorRate * 100).toFixed(1)}%`)

    // 2. Собираем данные для анализа
    const currentPrompt = await this.promptRegistry.getPrompt(contractId)
    const failedExamples = check.snapshot.recentFailures
    const errorPatterns = this.analyzePatterns(failedExamples)

    // 3. AI улучшает промпт
    console.log(`🤖 Asking AI to improve prompt...`)
    const improvement = await this.metaEngine.improvePrompt({
      currentPrompt: currentPrompt.text,
      failedExamples,
      errorPatterns,
      contractSchema: currentPrompt.schema,
    })

    console.log(`💡 AI suggests improvements:`)
    console.log(`   Rationale: ${improvement.rationale}`)
    console.log(`   Confidence: ${(improvement.confidence * 100).toFixed(0)}%`)

    // 4. Генерируем тестовый набор
    console.log(`🧪 Generating test suite...`)
    const goldenExamples = await this.loadGoldenExamples(contractId)
    const generatedTests = await Promise.all(
      goldenExamples.map(g => this.testGenerator.generateTestFromDSL(g))
    )

    // Добавляем вариации проблемных фраз
    const failedVariations = await Promise.all(
      failedExamples.slice(0, 3).map(f => 
        this.testGenerator.generateVariationsFromFailed(f)
      )
    )

    const allTests = [...generatedTests, ...failedVariations.flat()]
    console.log(`   Generated ${allTests.length} test cases`)

    // 5. A/B тестирование
    console.log(`⚖️  Running A/B test...`)
    const abResult = await this.abTester.runTest({
      promptA: currentPrompt.text,
      promptB: improvement.improvedPrompt,
      testSuite: allTests,
      provider: this.metaEngine.aiProvider,
    })

    console.log(`\n📊 A/B Test Results:`)
    console.log(`   Prompt A (current): ${(abResult.promptA.validationSuccessRate * 100).toFixed(1)}% success`)
    console.log(`   Prompt B (improved): ${(abResult.promptB.validationSuccessRate * 100).toFixed(1)}% success`)
    console.log(`   Winner: ${abResult.winner}`)
    console.log(`   Improvement: ${abResult.improvement > 0 ? '+' : ''}${abResult.improvement.toFixed(1)}%`)

    // 6. Принимаем решение
    if (abResult.recommendation === "apply") {
      console.log(`✅ Applying improved prompt...`)
      
      await this.promptRegistry.updatePrompt(contractId, {
        text: improvement.improvedPrompt,
        rationale: improvement.rationale,
        previousVersion: currentPrompt.version,
        testResults: abResult,
      })

      return {
        status: "applied",
        improvement: abResult.improvement,
        newVersion: currentPrompt.version + 1,
        abTestResult: abResult,
      }
    } else if (abResult.recommendation === "reject") {
      console.log(`❌ Rejecting improved prompt (worse than current)`)
      
      return {
        status: "rejected",
        reason: "New prompt performed worse",
        abTestResult: abResult,
      }
    } else {
      console.log(`🔍 Manual review required (marginal improvement)`)
      
      await this.promptRegistry.saveDraft(contractId, {
        text: improvement.improvedPrompt,
        rationale: improvement.rationale,
        status: "pending_review",
        testResults: abResult,
      })

      return {
        status: "pending_review",
        reason: "Improvement too small, needs manual review",
        draftSaved: true,
        abTestResult: abResult,
      }
    }
  }

  private analyzePatterns(failures: FailedExample[]): ErrorPattern[] {
    // Используем FeedbackAnalyzer
    const analyzer = new FeedbackAnalyzer()
    failures.forEach(f => {
      f.errors.forEach(e => analyzer.addResult({
        ok: false,
        errors: [e],
      }))
    })
    return analyzer.analyze()
  }

  private async loadGoldenExamples(contractId: string): Promise<GoldenExample[]> {
    // Загружаем эталонные примеры из базы
    // Пока заглушка
    return [
      {
        id: "golden_1",
        dsl: {
          entry: "start",
          lanes: [{ id: "lane_1", label: "Lane 1" }],
          steps: [
            { id: "start", label: "Start", lane: "lane_1", next: "end" },
            { id: "end", label: "End", lane: "lane_1" },
          ],
        },
      },
    ]
  }
}
```

---

## 🎬 Сценарий работы (полный цикл)

### Триггер события

```typescript
// В CLI или в фоновом процессе

// Периодически проверяем (каждые 5 минут)
setInterval(async () => {
  const monitor = new ErrorThresholdMonitor(config)
  const check = monitor.check()
  
  if (check.exceeded) {
    // Запускаем автокоррекцию!
    const orchestrator = new AutoCorrectionOrchestrator(
      monitor,
      new MetaPromptEngine(groqProvider),
      new TestGenerator(groqProvider),
      new PromptABTester(),
      adaptiveRegistry
    )

    const report = await orchestrator.runAutoCorrectionCycle("process.v1.extract")
    
    console.log("\n📋 Auto-correction Report:")
    console.log(JSON.stringify(report, null, 2))
    
    if (report.status === "applied") {
      console.log("✨ Prompt has been automatically improved!")
    }
  }
}, 5 * 60 * 1000)  // Каждые 5 минут
```

### Пример вывода в консоль

```
⚠️  Error rate exceeded threshold: 18.5%
Collected 12 failed examples in last hour.

🤖 Asking AI to improve prompt...

💡 AI suggests improvements:
   Rationale: Added explicit field name constraints and examples
   Confidence: 87%
   Changes:
   - Added rule: "Use 'label' not 'name' for all labels"
   - Added rule: "Use 'lane' not 'lane_id' for lane references"
   - Included 2 examples showing correct structure

🧪 Generating test suite...
   Generated 15 test cases (5 golden + 10 variations)

⚖️  Running A/B test on 15 tests...
   Testing Prompt A... [====================] 15/15
   Testing Prompt B... [====================] 15/15

📊 A/B Test Results:
   Prompt A (current):  73.3% success rate
   Prompt B (improved): 93.3% success rate
   Winner: B
   Improvement: +27.4%

✅ Applying improved prompt to registry...
   Version: 2.1.0 → 2.2.0
   Saved at: .specrails/prompts/process.v1.extract/v2.2.0.md

✨ Prompt has been automatically improved!
   Next requests will use the new version.

📋 Auto-correction Report:
{
  "status": "applied",
  "improvement": 27.4,
  "newVersion": "2.2.0",
  "testCoverage": 15,
  "previousSuccessRate": 0.733,
  "newSuccessRate": 0.933
}
```

---

## 📂 Структура файлов (расширенная)

```
process-core-proto/
├── packages/
│   └── parser/
│       └── src/
│           ├── parser.ts
│           │
│           ├── monitoring/
│           │   └── error-threshold-monitor.ts    # 🆕 Мониторинг порога
│           │
│           ├── meta/
│           │   ├── meta-prompt-engine.ts         # 🆕 AI для улучшения промптов
│           │   └── meta-prompts/
│           │       ├── improve-prompt.md         # Метапромпт для улучшения
│           │       └── reverse-engineer.md       # Метапромпт для генерации текста
│           │
│           ├── testing/
│           │   ├── test-generator.ts             # 🆕 Генерация тестов
│           │   ├── prompt-ab-tester.ts           # 🆕 A/B тестирование
│           │   └── golden-examples.json          # Эталонные примеры
│           │
│           ├── orchestration/
│           │   └── auto-correction-orchestrator.ts  # 🆕 Координатор
│           │
│           ├── feedback-analyzer.ts
│           ├── prompt-improver.ts
│           │
│           └── contracts/
│               └── adaptive-prompt.ts
│
├── .specrails/                                   # 🆕 Данные системы
│   ├── telemetry/
│   │   ├── validation-results.jsonl             # История валидаций
│   │   └── ab-test-results.jsonl                # Результаты A/B тестов
│   │
│   ├── prompts/
│   │   └── process.v1.extract/
│   │       ├── v2.0.0.md                        # Версии промптов
│   │       ├── v2.1.0.md
│   │       ├── v2.2.0.md                        # <- Текущая
│   │       └── drafts/
│   │           └── pending-review-001.md        # Черновики для ревью
│   │
│   └── golden-examples/
│       └── process.v1.extract/
│           ├── example-001.json                 # Эталонные DSL
│           ├── example-002.json
│           └── ...
```

---

## 🎯 Обновленная roadmap

### Фаза 1: Foundation (Week 1-2)
**Этап 1a: Базовый прототип** (как в оригинальном плане)
- Улучшить промпт вручную
- Протестировать на примерах
- **Цель:** > 80% успешных валидаций

**Этап 1b: Мониторинг и сбор данных**
- Реализовать ErrorThresholdMonitor
- Собирать failed examples
- **Цель:** Видим когда нужна коррекция

---

### Фаза 2: Meta-AI Integration (Week 3-4)
**Этап 2a: MetaPromptEngine**
- Реализовать улучшение промптов через AI
- Создать метапромпты
- **Цель:** AI предлагает улучшения

**Этап 2b: TestGenerator**
- Reverse engineering: DSL → Text
- Генерация вариаций
- **Цель:** Автоматические тесты

---

### Фаза 3: A/B Testing & Automation (Week 5-6)
**Этап 3a: PromptABTester**
- Сравнение промптов
- Метрики качества
- **Цель:** Объективная оценка

**Этап 3b: AutoCorrectionOrchestrator**
- Полный цикл автокоррекции
- Интеграция всех компонентов
- **Цель:** Полная автоматизация

---

### Фаза 4: Production Ready (Week 7-8)
**Этап 4a: Continuous Improvement**
- Фоновый процесс мониторинга
- Автоматические циклы улучшения
- **Цель:** Система сама улучшается

**Этап 4b: Dashboard & Observability**
- Визуализация метрик
- История улучшений
- **Цель:** Прозрачность процесса

---

## 📊 Метрики и KPI

### Метрики эффективности автокоррекции

| Метрика | Описание | Целевое значение |
|---------|----------|------------------|
| **Auto-fix Success Rate** | % успешных автокоррекций | > 70% |
| **Improvement Delta** | Средний прирост качества | > 15% |
| **Time to Correction** | Время от обнаружения до применения | < 10 минут |
| **False Positive Rate** | % неудачных улучшений | < 10% |
| **Manual Override Rate** | % ручных вмешательств | < 20% |

### Метрики качества тестов

| Метрика | Описание | Целевое значение |
|---------|----------|------------------|
| **Test Generation Success** | % успешно сгенерированных тестов | > 90% |
| **Test Realism Score** | Качество обратного преобразования | > 0.8 |
| **Test Coverage** | Покрытие различных сценариев | > 80% |

---

## 🔐 Безопасность и контроль

### Правила безопасности

1. **Threshold для автоприменения**
   ```typescript
   const AUTO_APPLY_THRESHOLD = {
     minImprovement: 10,      // минимум +10% улучшения
     minTests: 15,            // минимум 15 тестов
     minConfidence: 0.8,      // уверенность AI > 80%
   }
   ```

2. **Откат при деградации**
   - Если новый промпт показывает < 90% от старого → автооткат
   - Алерт команде

3. **Человек в цикле для критичных изменений**
   - Если improvement < 10% → manual review
   - Если confidence < 0.7 → manual review
   - Первые 3 автокоррекции → manual review

4. **Rate limiting**
   - Максимум 1 автокоррекция в час
   - Максимум 3 автокоррекции в день

### Audit Trail

```typescript
interface CorrectionAuditEntry {
  timestamp: string
  contractId: string
  trigger: "threshold_exceeded" | "manual_request"
  oldPrompt: {
    version: string
    hash: string
  }
  newPrompt: {
    version: string
    hash: string
    rationale: string
  }
  abTestResults: ABTestResult
  decision: "applied" | "rejected" | "pending_review"
  appliedBy: "system" | "human"
}
```

---

## 💡 Преимущества полной автоматизации

### 1. Скорость реакции
- **Без автоматизации:** Неделя на обнаружение → анализ → исправление
- **С автоматизацией:** 10 минут от обнаружения до применения

### 2. Масштабируемость
- Можно поддерживать десятки контрактов
- Каждый контракт автоматически улучшается

### 3. Объективность
- A/B тесты дают числовые метрики
- Нет субъективных решений

### 4. Continuous Learning
- Система постоянно учится на ошибках
- Качество растёт со временем

### 5. Transparency
- Полный аудит всех изменений
- Можно откатиться к любой версии

---

## ⚠️ Риски и ограничения

### Технические риски

1. **Meta-AI Bias**
   - AI может ухудшить промпт
   - Митигация: A/B тестирование обязательно

2. **Test Quality**
   - Автогенерированные тесты могут быть нереалистичными
   - Митигация: Комбинируем с эталонными примерами

3. **Overfitting**
   - Промпт может оптимизироваться под конкретные ошибки
   - Митигация: Разнообразие тестового набора

4. **Drift в Meta-AI**
   - Сам Meta-AI может начать дрейфовать
   - Митигация: Версионирование метапромптов

### Бизнес риски

1. **Непредсказуемые изменения**
   - Автоматические изменения могут нарушить стабильность
   - Митигация: Пороги безопасности + rollback

2. **Стоимость AI вызовов**
   - Meta-AI + тестирование = много запросов
   - Митигация: Кэширование, батчинг

---

## 🎯 Стратегия внедрения

### Этап 1: Pilot (1 контракт)
- Тестируем на `process.v1.extract`
- Ручное одобрение всех изменений
- Собираем метрики

### Этап 2: Expansion (3-5 контрактов)
- Автоматизируем для простых контрактов
- Manual review для сложных

### Этап 3: Production (все контракты)
- Полная автоматизация с порогами безопасности
- Мониторинг и алерты

---

## ✅ Готовы начать?

**Приоритет 1: Реализовать минимальный прототип автокоррекции**

Следующие шаги:
1. Реализовать ErrorThresholdMonitor (простая версия)
2. Реализовать MetaPromptEngine (базовый метапромпт)
3. Создать 3-5 эталонных примеров (golden examples)
4. Запустить первый цикл автокоррекции вручную

**Хочешь начать с какого-то конкретного компонента?** 

Я рекомендую начать с:
1. **MetaPromptEngine** — самая интересная часть
2. **TestGenerator** — сразу увидим как работает reverse engineering
3. **ErrorThresholdMonitor** — простой, но необходимый

Что выберем?
