# AI Providers — Обзор

Документация по подключению и использованию различных AI API провайдеров в SpecRails.

## 📋 Доступные провайдеры

| Провайдер         | Модель           | Бесплатный tier | JSON Schema  | Скорость        | Качество   |
| ----------------- | ---------------- | --------------- | ------------ | --------------- | ---------- |
| **Google Gemini** | Gemini 1.5 Flash | 15 req/min      | ✅ Да        | 🚀 Быстро       | ⭐⭐⭐⭐   |
| **Groq**          | Llama 3.1 70B    | 14,400 req/day  | ⚠️ JSON mode | ⚡ Очень быстро | ⭐⭐⭐     |
| **OpenAI**        | GPT-4o-mini      | $5 кредитов     | ✅ JSON mode | 🚀 Быстро       | ⭐⭐⭐⭐⭐ |

## 🎯 Рекомендации по выбору

### Для разработки и экспериментов

**→ Google Gemini**

- Самый щедрый бесплатный tier
- Нативная поддержка JSON Schema
- Не требует кредитной карты

### Для production с высокими требованиями к скорости

**→ Groq**

- Максимальная скорость ответов
- Большой дневной лимит
- Совместимость с OpenAI API

### Для максимального качества

**→ OpenAI**

- Лучшее качество генерации
- Надёжный JSON mode
- Отличная документация

## 📚 Детальные инструкции

- [Google Gemini](gemini.md) — Подключение и настройка
- [Groq](groq.md) — Подключение и настройка
- [OpenAI](openai.md) — Подключение и настройка

## 🔧 Быстрая настройка

### 1. Выбери провайдера и получи API ключ

- **Gemini:** https://aistudio.google.com/app/apikey
- **Groq:** https://console.groq.com/keys
- **OpenAI:** https://platform.openai.com/api-keys

### 2. Создай `.env` файл

```bash
# В корне process-core-proto/
# Выбери нужный провайдер (или несколько)

GEMINI_API_KEY=your_gemini_key_here
GROQ_API_KEY=your_groq_key_here
OPENAI_API_KEY=your_openai_key_here
```

### 3. Используй в коде

```typescript
import { GeminiAiProvider } from "./packages/parser/src/providers/gemini.js"
import { Parser } from "./packages/parser/src/parser.js"

const provider = new GeminiAiProvider(process.env.GEMINI_API_KEY)
const parser = new Parser(provider)
```

## 🧪 Тестирование провайдеров

Создай тестовый скрипт для сравнения:

```bash
# Запуск с разными провайдерами
export PROVIDER=gemini  # или groq, openai
npm run build
node dist/src/cli.js process:extract "School public? yes -> review; no -> auto."
```

---

## 📝 Заметки

Используй эту секцию для своих заметок о провайдерах, сравнений, особенностей и т.д.

### Сравнение качества

_(добавь свои наблюдения)_

### Особенности поведения

_(добавь свои заметки)_

### Проблемы и решения

_(добавь свои записи)_
