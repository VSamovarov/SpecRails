# План работы — Автокоррекция промптов и Groq интеграция

**Дата создания:** 2026-02-11  
**Проект:** SpecRails / process-core-proto  
**Цель:** Создать рабочий прототип ядра с Groq API и механизмом автокоррекции промптов

---

## 🎯 Общая задача

Получить **рабочий прототип ядра** с использованием Groq API, который:
1. Стабильно генерирует правильный DSL
2. Автоматически улучшает промпты на основе ошибок валидации
3. Работает с механизмом обратной связи

---

## 📋 Три ключевых вопроса

### 1️⃣ Универсальность промптов для всех провайдеров

**Вопрос:** Можно ли сделать один промпт для Gemini, Groq, OpenAI?

**Анализ:**

#### Различия между провайдерами

| Аспект | Gemini | Groq | OpenAI |
|--------|--------|------|--------|
| **JSON Schema** | ✅ Нативная поддержка | ⚠️ Только JSON mode | ✅ JSON mode + Structured Outputs |
| **Инструкции** | Хорошо следует | Требует примеров | Отлично следует |
| **Названия полей** | Точно | ❌ Придумывает свои | Точно |
| **System prompt** | Поддерживает | Поддерживает | Поддерживает |

#### Вывод: Гибридный подход

**НЕ можем:** Сделать один промпт для всех  
**Можем:** Сделать базовый шаблон + специфичные адаптации

```
Базовый промпт (90% общего)
    ↓
    ├─→ Gemini адаптация (схема в responseSchema)
    ├─→ Groq адаптация (примеры в промпте)
    └─→ OpenAI адаптация (Structured Outputs)
```

#### Рекомендация

**Архитектура промптов:**

```typescript
interface PromptTemplate {
  base: string              // Общая часть (инструкции, контекст)
  examples?: Example[]      // Примеры (для Groq критично)
  schema: JSONSchema        // Контракт
  adaptations: {
    gemini?: ProviderHints
    groq?: ProviderHints
    openai?: ProviderHints
  }
}
```

**Стратегия:**
1. Начинаем с **базового промпта** (работает везде, но не оптимально)
2. Добавляем **адаптации** для каждого провайдера по мере необходимости
3. Автокоррекция улучшает **базовый промпт** (общий для всех)

---

### 2️⃣ Место модуля автокоррекции в архитектуре

**Вопрос:** Куда поместить механизм автокоррекции промптов?

#### Анализ слоёв архитектуры

```
Governance Layer (Управление)
    ↓
Process Layer (Процессы)
    ↓
Core Layer (Ядро)
```

#### Где НЕ должен быть модуль автокоррекции

❌ **Core Layer** — детерминированный, без AI  
❌ **Validator** — только проверяет, не учится  
❌ **Parser** — только парсит, не анализирует

#### Где ДОЛЖЕН быть модуль

✅ **Process Layer** — между Parser и Validator

**Почему:**
- Имеет доступ к результатам валидации (ошибки)
- Имеет доступ к Parser (может обновить промпт)
- НЕ является частью детерминированного ядра
- Может координировать цикл улучшения

#### Предлагаемое место в архитектуре

```
process-core-proto/
├── packages/
│   ├── process-core/        # Core Layer
│   │   └── src/
│   │       ├── validate.ts  # Validator (детерминированный)
│   │       └── ...
│   │
│   └── parser/              # Process Layer
│       └── src/
│           ├── parser.ts                # Parser
│           ├── prompt-improver.ts       # 🆕 Автокоррекция промптов
│           ├── feedback-analyzer.ts     # 🆕 Анализ обратной связи
│           └── contracts/
│               ├── registry.ts          # Prompt Registry
│               └── adaptive-prompt.ts   # 🆕 Адаптивные промпты
```

#### Новый компонент: PromptImprover

**Ответственность:**
- Анализирует ошибки валидации
- Предлагает улучшения промпта
- Обновляет Prompt Registry
- НЕ изменяет Core компоненты

---

### 3️⃣ Механизм автокоррекции промпта

**Вопрос:** Как реализовать автокоррекцию?

#### Принцип работы

```
1. Parser генерирует DSL
       ↓
2. Validator находит ошибки
       ↓
3. FeedbackAnalyzer собирает паттерны ошибок
       ↓
4. PromptImprover предлагает исправление промпта
       ↓
5. (Человек одобряет) → Prompt Registry обновляется
       ↓
6. Следующий запрос использует улучшенный промпт
```

#### Источники данных для автокоррекции

**1. Validation Errors (автоматические)**
```yaml
error_pattern:
  type: schema_violation
  field: lanes[0].label
  issue: "must have required property 'label'"
  frequency: 5 из 10 последних
  suggestion: "Add example with 'label' field in prompt"
```

**2. Human Feedback (ручные)**
```yaml
feedback:
  analyst: "AI использует 'name' вместо 'label'"
  correction: "Explicitly state: use 'label' not 'name'"
  applied: true
```

**3. Drift Metrics (тренды)**
```yaml
drift_pattern:
  field: steps[].lane
  old_format: "lane: lane_1"
  new_format: "lane_id: lane_1"
  started: "2026-02-11"
  suggestion: "Reinforce field names in prompt"
```

#### Типы автокоррекций

| Тип | Когда применять | Пример |
|-----|-----------------|--------|
| **Add Example** | Поле часто отсутствует | Добавить пример с этим полем |
| **Clarify Field Name** | Неверное название поля | "Use 'label', not 'name'" |
| **Add Constraint** | Нарушение формата | "IDs must be snake_case" |
| **Simplify** | Слишком сложные результаты | "Use minimal structure" |

---

## 🏗️ Архитектурное решение

### Новые модули в Process Layer

#### 1. FeedbackAnalyzer

**Файл:** `packages/parser/src/feedback-analyzer.ts`

**Что делает:**
- Собирает ошибки валидации
- Группирует по паттернам
- Определяет частоту повторения
- Предлагает тип коррекции

```typescript
interface FeedbackAnalyzer {
  analyze(errors: ValidationError[]): ErrorPattern[]
  
  detectPattern(history: ValidationResult[]): Pattern
  
  prioritize(patterns: ErrorPattern[]): ErrorPattern[]
}
```

#### 2. PromptImprover

**Файл:** `packages/parser/src/prompt-improver.ts`

**Что делает:**
- Принимает паттерны ошибок
- Генерирует предложения по улучшению промпта
- Применяет улучшения к базовому промпту
- Сохраняет историю изменений

```typescript
interface PromptImprover {
  improve(
    currentPrompt: PromptTemplate,
    patterns: ErrorPattern[]
  ): PromptImprovement
  
  applyImprovement(
    prompt: PromptTemplate,
    improvement: PromptImprovement
  ): PromptTemplate
}
```

#### 3. AdaptivePromptRegistry

**Файл:** `packages/parser/src/contracts/adaptive-prompt.ts`

**Что делает:**
- Расширяет Prompt Registry
- Хранит версии промптов
- Отслеживает изменения
- Позволяет откатиться к предыдущей версии

```typescript
interface AdaptivePromptRegistry extends PromptRegistry {
  updatePrompt(
    contractId: string,
    improvement: PromptImprovement
  ): Promise<void>
  
  getPromptHistory(contractId: string): PromptVersion[]
  
  rollback(contractId: string, version: number): Promise<void>
}
```

---

## 📐 Детальный дизайн модуля

### FeedbackAnalyzer — Анализатор обратной связи

```typescript
// packages/parser/src/feedback-analyzer.ts

export interface ValidationError {
  path: string
  code: string
  message: string
  severity: "error" | "warning"
}

export interface ErrorPattern {
  type: "missing_field" | "wrong_field_name" | "invalid_format" | "extra_field"
  field: string
  frequency: number  // из последних N запросов
  examples: string[]
  suggestion: string
}

export class FeedbackAnalyzer {
  private history: ValidationResult[] = []
  private maxHistorySize = 50

  addResult(result: ValidationResult): void {
    this.history.push(result)
    if (this.history.length > this.maxHistorySize) {
      this.history.shift()
    }
  }

  analyze(): ErrorPattern[] {
    // Группируем ошибки по полям
    const errorsByField = new Map<string, ValidationError[]>()
    
    for (const result of this.history) {
      if (!result.ok && result.errors) {
        for (const error of result.errors) {
          const field = this.extractField(error.path)
          if (!errorsByField.has(field)) {
            errorsByField.set(field, [])
          }
          errorsByField.get(field)!.push(error)
        }
      }
    }

    // Определяем паттерны
    const patterns: ErrorPattern[] = []
    
    for (const [field, errors] of errorsByField) {
      const frequency = errors.length
      if (frequency >= 3) {  // Минимум 3 раза
        const pattern = this.detectPatternType(field, errors)
        patterns.push({
          type: pattern.type,
          field,
          frequency,
          examples: errors.slice(0, 3).map(e => e.message),
          suggestion: this.generateSuggestion(pattern.type, field, errors),
        })
      }
    }

    return patterns.sort((a, b) => b.frequency - a.frequency)
  }

  private detectPatternType(
    field: string,
    errors: ValidationError[]
  ): { type: ErrorPattern["type"] } {
    const firstError = errors[0]
    
    if (firstError.message.includes("required property")) {
      return { type: "missing_field" }
    }
    if (firstError.message.includes("additional properties")) {
      return { type: "extra_field" }
    }
    if (firstError.message.includes("pattern")) {
      return { type: "invalid_format" }
    }
    
    return { type: "wrong_field_name" }
  }

  private generateSuggestion(
    type: ErrorPattern["type"],
    field: string,
    errors: ValidationError[]
  ): string {
    switch (type) {
      case "missing_field":
        return `Add example showing '${field}' field is required`
      case "wrong_field_name":
        return `Clarify correct field name for '${field}'`
      case "invalid_format":
        return `Add format constraint for '${field}'`
      case "extra_field":
        return `Remove mention of '${field}' from prompt`
      default:
        return `Review instructions for '${field}'`
    }
  }

  private extractField(path: string): string {
    // "/steps/0/label" → "steps[].label"
    return path.replace(/\/(\d+)\//g, "[]/")
  }
}
```

---

### PromptImprover — Улучшатель промптов

```typescript
// packages/parser/src/prompt-improver.ts

export interface PromptTemplate {
  base: string
  examples?: Array<{ input: string; output: object }>
  schema: object
}

export interface PromptImprovement {
  type: "add_example" | "clarify_instruction" | "add_constraint"
  target: string  // поле или раздел
  content: string
  reason: string
  confidence: number  // 0-1
}

export class PromptImprover {
  improve(
    currentPrompt: PromptTemplate,
    patterns: ErrorPattern[]
  ): PromptImprovement[] {
    const improvements: PromptImprovement[] = []

    for (const pattern of patterns) {
      const improvement = this.createImprovement(pattern, currentPrompt)
      if (improvement) {
        improvements.push(improvement)
      }
    }

    return improvements
  }

  private createImprovement(
    pattern: ErrorPattern,
    prompt: PromptTemplate
  ): PromptImprovement | null {
    switch (pattern.type) {
      case "missing_field":
        return this.improveMissingField(pattern, prompt)
      
      case "wrong_field_name":
        return this.improveFieldName(pattern, prompt)
      
      case "invalid_format":
        return this.improveFormat(pattern, prompt)
      
      default:
        return null
    }
  }

  private improveMissingField(
    pattern: ErrorPattern,
    prompt: PromptTemplate
  ): PromptImprovement {
    // Добавляем пример с этим полем
    return {
      type: "add_example",
      target: pattern.field,
      content: `Example must include '${pattern.field}' field`,
      reason: `Field '${pattern.field}' was missing in ${pattern.frequency} generations`,
      confidence: Math.min(pattern.frequency / 10, 1),
    }
  }

  private improveFieldName(
    pattern: ErrorPattern,
    prompt: PromptTemplate
  ): PromptImprovement {
    // Уточняем название поля
    const correctName = this.extractCorrectFieldName(pattern.field)
    return {
      type: "clarify_instruction",
      target: pattern.field,
      content: `IMPORTANT: Use field name '${correctName}', not any alternatives`,
      reason: `Incorrect field names detected ${pattern.frequency} times`,
      confidence: 0.9,
    }
  }

  private improveFormat(
    pattern: ErrorPattern,
    prompt: PromptTemplate
  ): PromptImprovement {
    return {
      type: "add_constraint",
      target: pattern.field,
      content: `Field '${pattern.field}' must match pattern: ^[a-z][a-z0-9_]*$`,
      reason: `Format violations detected ${pattern.frequency} times`,
      confidence: 0.8,
    }
  }

  private extractCorrectFieldName(field: string): string {
    // "steps[].label" → "label"
    const parts = field.split(".")
    return parts[parts.length - 1]
  }

  applyImprovements(
    prompt: PromptTemplate,
    improvements: PromptImprovement[]
  ): PromptTemplate {
    let updatedBase = prompt.base
    const updatedExamples = [...(prompt.examples || [])]

    for (const improvement of improvements) {
      switch (improvement.type) {
        case "add_example":
          // Добавляем пример (пока заглушка)
          // В реальности здесь нужен AI для генерации примера
          break

        case "clarify_instruction":
          // Добавляем инструкцию в базовый промпт
          updatedBase = this.insertInstruction(updatedBase, improvement.content)
          break

        case "add_constraint":
          // Добавляем ограничение
          updatedBase = this.insertConstraint(updatedBase, improvement.content)
          break
      }
    }

    return {
      ...prompt,
      base: updatedBase,
      examples: updatedExamples,
    }
  }

  private insertInstruction(base: string, instruction: string): string {
    // Ищем секцию "Rules:" или добавляем в конец
    if (base.includes("Rules:")) {
      return base.replace("Rules:", `Rules:\n- ${instruction}`)
    }
    return `${base}\n\nRules:\n- ${instruction}`
  }

  private insertConstraint(base: string, constraint: string): string {
    // Аналогично insertInstruction
    return this.insertInstruction(base, constraint)
  }
}
```

---

## 🎯 План реализации (по приоритетам)

### Этап 1: Минимальный рабочий прототип (2-3 дня)

**Цель:** Groq стабильно генерирует правильный DSL

#### Задачи:
1. ✅ **Улучшить базовый промпт вручную**
   - Добавить примеры правильного формата
   - Явно указать названия полей: `label`, `lane`, `next`, `branches`
   - Добавить правила для `id` (snake_case)

2. ✅ **Протестировать на 10+ примерах**
   - Простые процессы
   - Процессы с ветвлениями
   - Сложные процессы

3. ✅ **Измерить успешность**
   - Сколько проходят валидацию с первого раза
   - Какие ошибки остаются

**Критерий успеха:** > 80% запросов проходят валидацию с первого раза

---

### Этап 2: Базовый сбор обратной связи (1-2 дня)

**Цель:** Система собирает паттерны ошибок

#### Задачи:
1. ✅ **Создать FeedbackAnalyzer (упрощённый)**
   ```typescript
   class SimpleFeedbackAnalyzer {
     private errors: ValidationError[] = []
     
     addError(error: ValidationError): void
     
     getTopErrors(): ErrorPattern[]
   }
   ```

2. ✅ **Интегрировать в CLI**
   - После каждой генерации сохранять результат валидации
   - Периодически выводить статистику

3. ✅ **Создать простой отчёт**
   ```bash
   npm run feedback:report
   # Выводит топ-5 частых ошибок
   ```

**Критерий успеха:** Видим какие ошибки повторяются чаще всего

---

### Этап 3: Ручная автокоррекция (1-2 дня)

**Цель:** Вручную улучшаем промпт на основе паттернов

#### Задачи:
1. ✅ **Анализировать отчёт FeedbackAnalyzer**
   - Смотрим какие ошибки повторяются
   - Определяем что нужно добавить в промпт

2. ✅ **Обновлять промпт**
   - Добавляем инструкции для исправления частых ошибок
   - Версионируем промпты (v1, v2, v3...)

3. ✅ **Измерять улучшение**
   - Сравниваем % успешных валидаций до и после

**Критерий успеха:** После ручных улучшений > 90% успешных валидаций

---

### Этап 4: Автоматическая автокоррекция (3-5 дней)

**Цель:** Система сама предлагает улучшения промпта

#### Задачи:
1. ✅ **Реализовать PromptImprover**
   - Базовые стратегии улучшения
   - Генерация предложений

2. ✅ **Создать Adaptive Prompt Registry**
   - Версионирование промптов
   - История изменений
   - Rollback функциональность

3. ✅ **Интегрировать в процесс**
   ```bash
   npm run prompt:analyze    # Анализ и предложения
   npm run prompt:apply      # Применение улучшений
   npm run prompt:rollback   # Откат к предыдущей версии
   ```

4. ✅ **Добавить approval mechanism**
   - Человек просматривает предложения
   - Одобряет или отклоняет
   - Система применяет только одобренные

**Критерий успеха:** Система предлагает релевантные улучшения в 70% случаев

---

### Этап 5: AI-powered автокоррекция (будущее)

**Цель:** AI сам генерирует улучшенные промпты

#### Задачи:
1. ⏳ **Использовать AI для генерации инструкций**
   - Подаём паттерны ошибок в AI
   - AI предлагает новые формулировки промпта

2. ⏳ **A/B тестирование промптов**
   - Тестируем старый vs новый промпт
   - Выбираем лучший на основе метрик

3. ⏳ **Continuous improvement**
   - Автоматический цикл улучшения
   - С контролем дрейфа

**Критерий успеха:** Система автономно улучшает качество генерации

---

## 📂 Структура файлов

```
process-core-proto/
├── packages/
│   └── parser/
│       └── src/
│           ├── parser.ts
│           │
│           ├── feedback-analyzer.ts        # 🆕 Этап 2
│           ├── prompt-improver.ts          # 🆕 Этап 4
│           │
│           ├── contracts/
│           │   ├── registry.ts
│           │   └── adaptive-prompt.ts      # 🆕 Этап 4
│           │
│           └── providers/
│               └── groq.ts
│
├── prompts/                                # 🆕 Версионированные промпты
│   └── process.v1.extract/
│       ├── base.v1.md
│       ├── base.v2.md                      # После улучшений
│       └── groq-adaptation.md              # Groq-специфичная часть
│
└── telemetry/                              # 🆕 Сбор данных
    └── feedback-history.jsonl              # История валидаций
```

---

## 🎯 Итоговая roadmap

### Неделя 1: Базовый прототип
- День 1-2: Улучшить промпт для Groq вручную
- День 3: Протестировать на примерах
- День 4: Замерить метрики (baseline)

### Неделя 2: Feedback система
- День 1: Реализовать FeedbackAnalyzer
- День 2: Интегрировать в CLI
- День 3: Собрать данные на 50+ примерах
- День 4: Ручная коррекция на основе данных

### Неделя 3: Автокоррекция
- День 1-2: Реализовать PromptImprover
- День 3-4: Adaptive Prompt Registry
- День 5: Интеграция и тестирование

### Неделя 4: Полировка
- Refinement
- Документация
- Демо

---

## 📊 Метрики успеха

| Метрика | Baseline | Этап 1 | Этап 3 | Этап 4 |
|---------|----------|--------|--------|--------|
| **Validation Success Rate** | ~10% | > 80% | > 90% | > 95% |
| **Avg Retry Count** | 3-5 | < 2 | < 1 | < 1 |
| **Field Name Accuracy** | 40% | 90% | 95% | 98% |
| **Manual Interventions** | Каждая генерация | 20% | 10% | 5% |

---

## 🔗 Связь с существующей архитектурой

### Интеграция с Observability Framework

**Что используем:**
- Drift Control — отслеживаем изменения в поведении AI
- Metrics — собираем статистику валидаций
- Audit Trail — логируем все изменения промптов

**Где хранится:**
```
.specrails/
├── telemetry/
│   ├── validation-results.jsonl    # Результаты валидаций
│   └── prompt-versions.jsonl       # История промптов
├── baselines/
│   └── process.v1.extract/         # Эталоны для drift
└── feedback/
    └── error-patterns.json         # Паттерны ошибок
```

### Интеграция с Validation Loop

```
User Input
    ↓
Parser (с текущим промптом)
    ↓
DSL Generated
    ↓
Validator
    ├─→ ✅ OK → Return DSL
    └─→ ❌ Error → FeedbackAnalyzer.addError()
              ↓
         (накапливаем паттерны)
              ↓
         PromptImprover.analyze()
              ↓
         Предложения улучшений
              ↓
         (Человек одобряет)
              ↓
         Prompt Registry обновляется
              ↓
         Следующий запрос использует улучшенный промпт
```

---

## ✅ Чеклист для старта

**Перед началом:**
- [ ] Определиться с приоритетом этапов
- [ ] Выбрать 10-20 тестовых примеров процессов
- [ ] Настроить хранилище для telemetry данных

**Этап 1 (начинаем завтра):**
- [ ] Улучшить базовый промпт для Groq
- [ ] Добавить примеры в промпт
- [ ] Явно указать названия полей
- [ ] Протестировать на примерах
- [ ] Замерить baseline метрики

**Готовность инфраструктуры:**
- [x] Groq API подключен
- [x] CLI работает
- [x] Validator функционирует
- [ ] Telemetry настроена (делаем на этапе 2)

---

## 💡 Принципы разработки

**YAGNI — You Aren't Gonna Need It:**
- Не строим сложную систему сразу
- Начинаем с ручной коррекции
- Автоматизируем только то, что реально используем

**KISS — Keep It Simple:**
- FeedbackAnalyzer — просто собирает ошибки
- PromptImprover — простые правила, не AI (сначала)
- Adaptive Registry — простое версионирование, не git

**Iterative improvement:**
- Этап 1: Manual → видим что работает
- Этап 2: Collect data → понимаем паттерны
- Этап 3: Semi-auto → помогаем системе
- Этап 4: Auto → система сама улучшается

---

**Статус:** 📝 План готов  
**Следующий шаг:** Начать Этап 1 — улучшить промпт для Groq
