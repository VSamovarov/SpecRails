# AI Providers

Адаптеры для различных AI API провайдеров.

## Доступные провайдеры

### 🧪 MockAiProvider

**Файл:** `mock.ts`  
**Назначение:** Тестовый провайдер без реального API  
**Использование:** Только для разработки и тестирования

### 🤖 GeminiAiProvider

**Файл:** `gemini.ts`  
**API:** Google Gemini 1.5 Flash  
**Документация:** [../../../docs/ai-providers/gemini.md](../../../docs/ai-providers/gemini.md)

**Особенности:**

- Поддержка JSON Schema
- Бесплатный tier: 15 запросов/минуту
- Быстрые ответы

### ⚡ GroqAiProvider

**Файл:** `groq.ts`  
**API:** Groq (Llama 3.1 70B)  
**Документация:** [../../../docs/ai-providers/groq.md](../../../docs/ai-providers/groq.md)

**Особенности:**

- OpenAI-совместимый API
- Очень быстрые ответы
- Бесплатный tier: 14,400 запросов/день

### 🧠 OpenAiProvider

**Файл:** `openai.ts`  
**API:** OpenAI GPT-4o-mini  
**Документация:** [../../../docs/ai-providers/openai.md](../../../docs/ai-providers/openai.md)

**Особенности:**

- Высокое качество генерации
- JSON mode
- Стартовые кредиты для новых пользователей

## Быстрый старт

```typescript
import { GeminiAiProvider } from "./providers/gemini.js"
import { GroqAiProvider } from "./providers/groq.js"
import { OpenAiProvider } from "./providers/openai.js"
import { Parser } from "./parser.js"

// Выбираем провайдера
const provider = new GeminiAiProvider(process.env.GEMINI_API_KEY)
// или
// const provider = new GroqAiProvider(process.env.GROQ_API_KEY)
// или
// const provider = new OpenAiProvider(process.env.OPENAI_API_KEY)

const parser = new Parser(provider)
const result = await parser.run({
  /* ... */
})
```

## Интерфейс AiProvider

Все провайдеры реализуют общий интерфейс:

```typescript
interface AiProvider {
  readonly name: string

  runStructured<T>(input: {
    system: string // System prompt
    prompt: string // User prompt
    schema: object // JSON Schema
  }): Promise<{
    data: T // Распарсенный JSON
    rawText: string // Сырой текст ответа
    model: string // Название использованной модели
  }>
}
```

## Детальная документация

Инструкции по подключению и настройке каждого провайдера:

- [Google Gemini](../../../docs/ai-providers/gemini.md)
- [Groq](../../../docs/ai-providers/groq.md)
- [OpenAI](../../../docs/ai-providers/openai.md)
