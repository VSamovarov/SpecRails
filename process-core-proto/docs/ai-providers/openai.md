# OpenAI API — Инструкция по подключению

**Провайдер:** `OpenAiProvider`  
**Модель:** GPT-4o-mini  
**Сайт:** https://openai.com/

---

## 🎯 Преимущества

✅ **Качество:** Лучшее качество генерации среди всех моделей  
✅ **JSON mode:** Надёжный structured output  
✅ **Документация:** Отличная документация и примеры  
✅ **Стабильность:** Проверено временем, надёжный API  
✅ **TypeScript SDK:** Официальный SDK с типами

⚠️ **Платно:** $5 бесплатных кредитов для новых аккаунтов (действуют 3 месяца)

---

## 📋 Шаги подключения

### 1. Создание аккаунта

1. Перейди на https://platform.openai.com/signup
2. Зарегистрируйся (email + телефон для верификации)
3. Подтверди телефон
4. Получи $5 бесплатных кредитов (для новых пользователей)

**Важно:** Требуется верификация телефона!

---

### 2. Получение API ключа

1. Перейди на https://platform.openai.com/api-keys
2. Нажми **"Create new secret key"**
3. Дай имя ключу (например, "SpecRails Dev")
4. Скопируй ключ (формат: `sk-proj-...`)

**Важно:** Ключ показывается только один раз!

---

### 3. Настройка проекта

Создай файл `.env` в корне `process-core-proto/`:

```bash
OPENAI_API_KEY=sk-proj-...ваш_ключ_здесь
```

Убедись что `.env` в `.gitignore`:

```bash
# В .gitignore уже должно быть:
.env
.env.local
```

---

### 4. Проверка подключения

```bash
cd process-core-proto
npm run build

# Windows PowerShell:
$env:OPENAI_API_KEY="sk-proj-...ваш_ключ"
node dist/src/cli.js process:extract "School public? yes -> review; no -> auto."

# Linux/Mac:
export OPENAI_API_KEY="sk-proj-...ваш_ключ"
node dist/src/cli.js process:extract "School public? yes -> review; no -> auto."
```

---

## 💻 Использование в коде

### Базовое использование

```typescript
import { OpenAiProvider } from "./packages/parser/src/providers/openai.js"
import { Parser } from "./packages/parser/src/parser.js"

const apiKey = process.env.OPENAI_API_KEY
if (!apiKey) {
  throw new Error("OPENAI_API_KEY not set")
}

const provider = new OpenAiProvider(apiKey)
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
    console.error("⚠️ Слишком много запросов")
  } else if (error.message.includes("Invalid API key")) {
    console.error("❌ Неверный API ключ")
  } else if (error.message.includes("insufficient_quota")) {
    console.error("❌ Кредиты закончились")
  } else {
    console.error("❌ Error:", error)
  }
}
```

---

## 🔧 Настройки модели

Провайдер использует:

- **Модель:** `gpt-4o-mini`
- **JSON mode:** `{ type: "json_object" }`
- **Temperature:** 0.1 (для стабильности)

### Доступные модели

Можно изменить модель в `openai.ts`:

```typescript
model: "gpt-4o-mini",        // По умолчанию (рекомендуется)
// или
model: "gpt-4o",             // Лучше качество, дороже
// или
model: "gpt-3.5-turbo",      // Дешевле, хуже качество
```

**Стоимость (примерно):**

- `gpt-4o-mini`: $0.15 / 1M input tokens, $0.60 / 1M output tokens
- `gpt-4o`: $2.50 / 1M input tokens, $10.00 / 1M output tokens
- `gpt-3.5-turbo`: $0.50 / 1M input tokens, $1.50 / 1M output tokens

---

## 💰 Стоимость и лимиты

### Бесплатные кредиты

- **Новые пользователи:** $5 бесплатных кредитов
- **Срок действия:** 3 месяца
- **После истечения:** Требуется оплата

### Пример расхода

Один запрос (process extraction):

- Input: ~500 tokens (промпт + schema)
- Output: ~200 tokens (DSL)

**gpt-4o-mini:**

- Input: 500 × $0.15 / 1M = $0.000075
- Output: 200 × $0.60 / 1M = $0.000120
- **Итого:** ~$0.0002 за запрос

**$5 = ~25,000 запросов** (gpt-4o-mini)

### Rate limits (Free tier)

| Параметр            | Лимит  |
| ------------------- | ------ |
| Requests per minute | 3      |
| Tokens per minute   | 40,000 |

**Paid tier** (после добавления карты):

- Requests per minute: 500+
- Tokens per minute: 200,000+

---

## 📊 Качество генерации

### Сильные стороны

- ✅ **Лучшее качество** среди всех провайдеров
- ✅ Отлично понимает контекст и инструкции
- ✅ Надёжный JSON mode
- ✅ Стабильные результаты

### Слабые стороны

- ⚠️ Требует оплаты после исчерпания кредитов
- ⚠️ Медленнее чем Groq
- ⚠️ Строгие rate limits на free tier

### Рекомендации

- Используй для важных задач где критично качество
- Для прототипирования лучше Gemini или Groq
- Сохраняй успешные результаты чтобы не повторять запросы

---

## 🔗 Полезные ссылки

- **Документация:** https://platform.openai.com/docs
- **API Keys:** https://platform.openai.com/api-keys
- **Usage:** https://platform.openai.com/usage
- **Pricing:** https://openai.com/api/pricing/
- **Rate Limits:** https://platform.openai.com/account/rate-limits
- **Examples:** https://platform.openai.com/docs/examples

---

## 🆚 Сравнение с другими провайдерами

| Параметр         | OpenAI      | Gemini       | Groq                |
| ---------------- | ----------- | ------------ | ------------------- |
| Качество         | ⭐⭐⭐⭐⭐  | ⭐⭐⭐⭐     | ⭐⭐⭐              |
| Скорость         | 🚀 Быстро   | 🚀 Быстро    | ⚡⚡⚡ Очень быстро |
| Бесплатный tier  | $5 кредитов | 15 req/min   | 14,400 req/day      |
| JSON Schema      | JSON mode   | ✅ Native    | JSON mode           |
| Цена (долгосрок) | 💰 Платно   | 🆓 Бесплатно | 🆓 Бесплатно        |

**Вывод:** OpenAI — лучший выбор для production где критично качество и есть бюджет.

---

## 📝 Личные заметки

_(Используй эту секцию для своих наблюдений, примеров, особенностей и т.д.)_

### Наблюдения по качеству

### Успешные промпты

### Проблемы и решения

### Советы по использованию

### Расход кредитов

### Сравнение с другими провайдерами
