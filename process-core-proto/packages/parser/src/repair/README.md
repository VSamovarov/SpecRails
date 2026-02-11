# Repairer — Исправление невалидного DSL

## 🎯 Концепция

**Repairer** — компонент, который исправляет невалидный DSL после генерации.

### Архитектура: Generator + Repairer

```
User Input
    ↓
Generator (Parser с обычным промптом)
    ↓
DSL (может быть невалидным)
    ↓
Validator
    ↓
    ├─ ✅ Valid → Return DSL
    │
    └─ ❌ Invalid
        ↓
    Repairer (AI с repair промптом)
        ↓
    Fixed DSL
        ↓
    Validator
        ↓
    ✅ Valid → Return DSL
```

## 💡 Преимущества этого подхода

### 1. Разделение задач
- **Generator** — простая задача "создай DSL из текста"
- **Repairer** — сложная задача "исправь конкретные ошибки"

### 2. Разные промпты
- **Generator промпт** — короткий, фокус на создании структуры
- **Repairer промпт** — детальный, фокус на исправлении ошибок

### 3. Можно использовать разные модели
- **Generator** — дешевая/быстрая модель (Groq, Gemini Flash)
- **Repairer** — мощная модель (Claude Sonnet, GPT-4)

## 📖 Использование

### В коде

```typescript
import { createRepairer } from "@specrails/parser"
import { GroqAiProvider } from "@specrails/parser"
import { validateSpecV1 } from "@specrails/process-core"

// Создаем провайдер (можно использовать тот же что для генерации)
const provider = new GroqAiProvider(process.env.GROQ_API_KEY)

// Создаем Repairer
const repairer = createRepairer(
  provider,
  validateSpecV1, // Функция валидации
  {
    maxAttempts: 3, // Максимум 3 попытки
    verbose: true,  // Показывать процесс
  }
)

// Исправляем невалидный DSL
const result = await repairer.repair({
  userInput: "User submits request -> review",
  invalidDSL: generatedDSL,
  validationErrors: validationResult.errors,
  contractId: "process.v1.extract",
})

if (result.success) {
  console.log("✅ DSL repaired:", result.repairedDSL)
} else {
  console.log("❌ Failed:", result.reason)
}
```

### Через CLI

```bash
# Новая команда с Repairer
GROQ_API_KEY=xxx node dist/cli.js process:extract-with-repair "User submits request -> review by manager -> approve or reject"

# Старая команда без Repairer
GROQ_API_KEY=xxx node dist/cli.js process:extract "User submits request -> review"
```

## 🔧 Как работает Repairer

### 1. Получает контекст ошибки

```typescript
{
  userInput: "User submits request -> review",
  invalidDSL: { /* невалидный DSL */ },
  validationErrors: [
    { message: "Unknown property 'name', expected 'label'" },
    { message: "Unknown property 'lane_id', expected 'lane'" }
  ],
  contractId: "process.v1.extract"
}
```

### 2. Формирует repair промпт

```
# Fix this invalid DSL

## What the user wanted
"User submits request -> review"

## Invalid DSL that was generated
{
  "lanes": [{"id": "user", "name": "User"}],  ← ошибка: name вместо label
  "steps": [{"id": "submit", "lane_id": "user"}]  ← ошибка: lane_id вместо lane
}

## Validation errors
1. Unknown property 'name', expected 'label'
   Path: lanes[0].name
   
2. Unknown property 'lane_id', expected 'lane'
   Path: steps[0].lane_id

## Your task
Fix the DSL above to pass validation. Return ONLY the corrected JSON.
```

### 3. AI исправляет

AI видит:
- Что хотел пользователь
- Что было сгенерировано
- Конкретные ошибки

И исправляет только то, что сломано.

### 4. Валидирует результат

Если валидация проходит → SUCCESS  
Если нет → повторяет (до maxAttempts)

## 📊 Метрики

Repairer собирает метрики:

```typescript
{
  success: true,          // Успешно ли исправлен
  attempt: 2,             // На какой попытке
  repairedDSL: {...},    // Исправленный DSL
}
```

## ⚙️ Конфигурация

```typescript
interface RepairConfig {
  maxAttempts: number  // Максимум попыток (по умолчанию 3)
  verbose: boolean     // Показывать процесс (по умолчанию true)
}
```

## 🎯 Когда использовать Repairer

### ✅ Хорошо подходит для:
- Исправление простых ошибок (field names, ID format)
- Структурные проблемы (missing fields)
- Несоответствие схеме

### ❌ Не подходит для:
- Полностью неправильная логика
- AI не понял задачу вообще
- Ошибки в промпте генератора (лучше исправить промпт)

## 🔄 Сравнение подходов

### Без Repairer (старый подход)
```
Parser → Validator → ❌ Invalid
         ↓
Parser retry с ошибками → Validator → ❌ Still invalid
```

**Проблема:** Parser видит те же инструкции + ошибки, но может повторить те же ошибки

### С Repairer (новый подход)
```
Parser → Validator → ❌ Invalid
         ↓
Repairer (специальный промпт) → Validator → ✅ Valid
```

**Преимущество:** Repairer специализирован на исправлении, другой промпт

## 🚀 Следующие шаги

1. **Тестирование** — проверить на реальных примерах
2. **Метрики** — собирать статистику успешности repair
3. **Разные модели** — попробовать дешевая генерация + мощный repair
4. **Автоматизация** — интегрировать в основной flow

## 📚 Связанные файлы

- [repairer.ts](repairer.ts) — основной класс
- [prompts.ts](prompts.ts) — промпты для repair
- [types.ts](types.ts) — типы и интерфейсы
- [../../../src/cli.ts](../../../src/cli.ts) — CLI команда process:extract-with-repair
