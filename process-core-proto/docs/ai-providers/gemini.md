# Google Gemini API — Инструкция по подключению

**Провайдер:** `GeminiAiProvider`  
**Модель:** Gemini 1.5 Flash  
**Сайт:** https://ai.google.dev/

---

## 🎯 Преимущества

✅ **Бесплатный tier:** 15 запросов/минуту, 1500 запросов/день  
✅ **JSON Schema:** Нативная поддержка с валидацией  
✅ **Без кредитной карты:** Требуется только Google аккаунт  
✅ **Быстро:** Ответы за 1-3 секунды  
✅ **Качество:** Хорошее для большинства задач

---

## 📋 Шаги подключения

### 1. Получение API ключа

1. Перейди на https://aistudio.google.com/app/apikey
2. Войди в Google аккаунт (или создай новый)
3. Нажми **"Create API Key"**
4. Скопируй ключ (формат: `AIza...`)

**Важно:** Ключ показывается только один раз!

---

### 2. Настройка проекта

Создай файл `.env` в корне `process-core-proto/`:

```bash
GEMINI_API_KEY=AIzaSy...ваш_ключ_здесь
```

Убедись что `.env` в `.gitignore`:

```bash
# В .gitignore уже должно быть:
.env
.env.local
```

---

### 3. Проверка подключения

```bash
cd process-core-proto
npm run build

# Windows PowerShell:
$env:GEMINI_API_KEY="AIzaSy...ваш_ключ"
node dist/src/cli.js process:extract "School public? yes -> review; no -> auto."

# Linux/Mac:
export GEMINI_API_KEY="AIzaSy...ваш_ключ"
node dist/src/cli.js process:extract "School public? yes -> review; no -> auto."
```

---

## 💻 Использование в коде

### Базовое использование

```typescript
import { GeminiAiProvider } from "./packages/parser/src/providers/gemini.js"
import { Parser } from "./packages/parser/src/parser.js"

const apiKey = process.env.GEMINI_API_KEY
if (!apiKey) {
  throw new Error("GEMINI_API_KEY not set")
}

const provider = new GeminiAiProvider(apiKey)
const parser = new Parser(provider)

const result = await parser.run({
  contractName: "process.v1.extract",
  userPrompt: "School public? yes -> review; no -> auto checks.",
})

console.log(result.output) // Готовый DSL
```

### С обработкой ошибок

```typescript
try {
  const result = await parser.run(input)
  console.log("✅ Success:", result.status)
} catch (error) {
  if (error.message.includes("Rate limit")) {
    console.error("⚠️ Слишком много запросов, подожди минуту")
  } else if (error.message.includes("Invalid API key")) {
    console.error("❌ Неверный API ключ")
  } else {
    console.error("❌ Error:", error)
  }
}
```

---

## 🔧 Настройки модели

Провайдер использует:

- **Модель:** `gemini-1.5-flash`
- **JSON Schema:** Передаётся через `responseSchema`
- **System Instruction:** Системный промпт

### Смена модели

Можно изменить на `gemini-1.5-pro` для лучшего качества (но медленнее):

```typescript
// В файле gemini.ts
model: "gemini-1.5-pro", // вместо gemini-1.5-flash
```

**Лимиты:**

- Flash: 15 req/min
- Pro: 2 req/min

---

## ⚠️ Лимиты и ограничения

### Бесплатный tier (Free tier)

| Параметр            | Лимит     |
| ------------------- | --------- |
| Requests per minute | 15        |
| Requests per day    | 1,500     |
| Tokens per minute   | 1,000,000 |

### Обработка rate limits

Провайдер автоматически выбрасывает ошибку при превышении:

```
Error: Rate limit exceeded. Please try again later.
```

**Решение:** Подожди 1 минуту перед следующим запросом.

---

## 📊 Качество генерации

### Сильные стороны

- ✅ Хорошо понимает структурированные задачи
- ✅ Надёжная валидация JSON Schema
- ✅ Стабильные результаты

### Слабые стороны

- ⚠️ Может быть слишком "осторожным" в edge cases
- ⚠️ Иногда упрощает сложные процессы

### Рекомендации

- Давай чёткие инструкции в system prompt
- Используй примеры в промпте
- Указывай требования к `id` (snake_case)

---

## 🔗 Полезные ссылки

- **Документация:** https://ai.google.dev/docs
- **Quickstart:** https://ai.google.dev/gemini-api/docs/quickstart?lang=node
- **API ключи:** https://aistudio.google.com/app/apikey
- **Pricing:** https://ai.google.dev/pricing
- **Лимиты:** https://ai.google.dev/gemini-api/docs/quota

---

## 📝 Личные заметки

_(Используй эту секцию для своих наблюдений, примеров, особенностей и т.д.)_

### Наблюдения по качеству

### Успешные промпты

### Проблемы и решения

### Советы по использованию
