# Groq API — Инструкция по подключению

**Провайдер:** `GroqAiProvider`  
**Модель:** Llama 3.1 70B Versatile  
**Сайт:** https://groq.com/

---

## 🎯 Преимущества

✅ **Бесплатный tier:** 14,400 запросов/день (~10 запросов/минуту)  
✅ **Скорость:** Очень быстрые ответы (GroqChip™)  
✅ **OpenAI-совместимость:** Использует OpenAI SDK  
✅ **Без кредитной карты:** Требуется только email  
✅ **Несколько моделей:** Llama, Mixtral, Gemma

---

## 📋 Шаги подключения

### 1. Получение API ключа

1. Перейди на https://console.groq.com/
2. Нажми **"Sign Up"** или **"Log In"**
3. Подтверди email
4. Перейди в **"API Keys"**: https://console.groq.com/keys
5. Нажми **"Create API Key"**
6. Скопируй ключ (формат: `gsk_...`)

**Важно:** Сохрани ключ в безопасном месте!

---

### 2. Настройка проекта

Создай файл `.env` в корне `process-core-proto/`:

```bash
GROQ_API_KEY=gsk_...ваш_ключ_здесь
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
$env:GROQ_API_KEY="gsk_...ваш_ключ"
node dist/src/cli.js process:extract "School public? yes -> review; no -> auto."

# Linux/Mac:
export GROQ_API_KEY="gsk_...ваш_ключ"
node dist/src/cli.js process:extract "School public? yes -> review; no -> auto."
```

---

## 💻 Использование в коде

### Базовое использование

```typescript
import { GroqAiProvider } from "./packages/parser/src/providers/groq.js"
import { Parser } from "./packages/parser/src/parser.js"

const apiKey = process.env.GROQ_API_KEY
if (!apiKey) {
  throw new Error("GROQ_API_KEY not set")
}

const provider = new GroqAiProvider(apiKey)
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
    console.error("⚠️ Слишком много запросов, подожди")
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

- **Модель:** `llama-3.1-70b-versatile`
- **JSON mode:** `{ type: "json_object" }`
- **Temperature:** 0.1 (для стабильности)

### Доступные модели

Можно изменить модель в `groq.ts`:

```typescript
model: "llama-3.1-70b-versatile",  // По умолчанию (рекомендуется)
// или
model: "llama-3.1-8b-instant",      // Быстрее, но качество ниже
// или
model: "mixtral-8x7b-32768",        // Альтернатива
```

**Скорость:**

- `llama-3.1-70b`: ~1-2 секунды
- `llama-3.1-8b`: ~0.5-1 секунда

---

## ⚠️ Лимиты и ограничения

### Бесплатный tier

| Параметр            | Лимит  |
| ------------------- | ------ |
| Requests per day    | 14,400 |
| Requests per minute | ~10    |
| Tokens per minute   | 15,000 |

### Обработка rate limits

Провайдер автоматически выбрасывает ошибку при превышении:

```
Error: Rate limit exceeded. Please try again later.
```

**Решение:** Подожди несколько секунд перед следующим запросом.

---

## 📊 Качество генерации

### Сильные стороны

- ✅ Очень быстрые ответы (GroqChip™ ускоритель)
- ✅ Хорошее понимание инструкций
- ✅ Стабильная генерация JSON

### Слабые стороны

- ⚠️ JSON mode менее строгий чем JSON Schema
- ⚠️ Может добавлять лишние поля
- ⚠️ Требует более детальных промптов

### Рекомендации

- Явно указывай формат вывода в промпте
- Приводи примеры желаемого JSON
- Проверяй результат на соответствие схеме
- Используй `temperature: 0.1` для консистентности

---

## 🔗 Полезные ссылки

- **Документация:** https://console.groq.com/docs/quickstart
- **API Keys:** https://console.groq.com/keys
- **Models:** https://console.groq.com/docs/models
- **Playground:** https://console.groq.com/playground
- **Pricing:** https://groq.com/pricing/ (Free tier info)

---

## 🆚 Сравнение с OpenAI

| Параметр        | Groq                | OpenAI                |
| --------------- | ------------------- | --------------------- |
| Скорость        | ⚡⚡⚡ Очень быстро | 🚀 Быстро             |
| Качество        | ⭐⭐⭐ Хорошо       | ⭐⭐⭐⭐⭐ Отлично    |
| Бесплатный tier | 14,400 req/day      | $5 кредитов           |
| JSON Schema     | ❌ Только JSON mode | ✅ Structured Outputs |
| API             | OpenAI-совместимый  | Оригинальный OpenAI   |

**Вывод:** Groq отлично подходит для быстрого прототипирования с большим количеством запросов.

---

## 📝 Личные заметки

_(Используй эту секцию для своих наблюдений, примеров, особенностей и т.д.)_

### Наблюдения по качеству

### Успешные промпты

### Проблемы и решения

### Советы по использованию

### Сравнение с другими провайдерами
