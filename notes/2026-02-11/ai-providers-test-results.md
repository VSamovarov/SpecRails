# Результаты тестирования AI провайдеров — 2026-02-11

**Дата:** 2026-02-11  
**Проект:** SpecRails / process-core-proto  
**Цель:** Протестировать подключение Gemini и Groq AI провайдеров

---

## 📊 Краткие результаты

| Провайдер | Статус | Модель | Проблемы |
|-----------|--------|--------|----------|
| **Groq** | ✅ Работает | llama-3.3-70b-versatile | ⚠️ Не следует JSON Schema |
| **Gemini** | ❌ Не работает | - | ❌ API ключ не проходит |
| **OpenAI** | ⏸️ Не тестировали | - | Нет ключа |

---

## ⚡ Groq — Работает!

### ✅ Статус подключения
- **API ключ:** Валиден
- **Соединение:** Успешно
- **Скорость:** 1-2 секунды (очень быстро!)
- **Модель:** `llama-3.3-70b-versatile`

### 🔧 Обновления
Обнаружено и исправлено:
- Модель `llama-3.1-70b-versatile` была decommissioned
- Обновлена на `llama-3.3-70b-versatile` в [groq.ts](../../process-core-proto/packages/parser/src/providers/groq.ts)

### ⚠️ Обнаруженная проблема

**Проблема:** Groq использует JSON mode, но не строго следует JSON Schema.

**Что генерирует Groq:**
```json
{
  "lanes": [
    {
      "id": "user_lane",
      "name": "User"              // ❌ должно быть "label"
    }
  ],
  "steps": [
    {
      "id": "submit_request",
      "name": "Submit Request",    // ❌ должно быть "label"
      "lane_id": "user_lane"       // ❌ должно быть "lane"
    }
  ],
  "entry": "submit_request",
  "next": {                         // ❌ неправильная структура
    "submit_request": "review_request"
  }
}
```

**Что ожидается по схеме:**
```json
{
  "entry": "submit_request",
  "lanes": [
    {
      "id": "user_lane",
      "label": "User"              // ✅ правильно
    }
  ],
  "steps": [
    {
      "id": "submit_request",
      "label": "Submit Request",   // ✅ правильно
      "lane": "user_lane",         // ✅ правильно
      "next": "review_request"     // ✅ встроено в step
    }
  ]
}
```

### 📝 Примеры тестов

#### Тест 1: Сложный процесс
```bash
node dist/src/cli.js process:extract "School public? yes -> dept review; no -> auto checks; then decision."
```

**Результат:** Генерирует JSON, но с неверными полями (`name`, `lane_id`, `next` как объект).

#### Тест 2: Простой процесс
```bash
node dist/src/cli.js process:extract "User submits request -> review by manager -> approve or reject"
```

**Результат:** Та же проблема — неверные названия полей.

### ✅ Что работает хорошо
- Быстрые ответы (~1-2 секунды)
- Понимает логику процесса
- Правильно определяет ветвления (branches/XOR)
- Генерирует валидный JSON

### ❌ Что нужно исправить
1. **Улучшить system prompt** — явно указать точные названия полей
2. **Добавить примеры** в промпт с правильной структурой
3. **Использовать repair loop** — автокоррекция на основе validator errors
4. **Возможно, добавить post-processing** для переименования полей

---

## 🤖 Gemini — Не работает

### ❌ Статус подключения
- **API ключ:** `AIzaSyBKAT0i5f7fusgj2b5xEK_dRPGL_7YKZHI`
- **Соединение:** Ошибка
- **Ошибка:** `404 Not Found - models/xxx is not found for API version v1beta`

### 🔍 Попытки исправления

Попробовали разные модели:

| Модель | Результат |
|--------|-----------|
| `gemini-1.5-flash` | ❌ 404 Not Found |
| `gemini-1.5-pro` | ❌ 404 Not Found |
| `gemini-pro` | ❌ 404 Not Found |
| `gemini-1.0-pro-latest` | ❌ 404 Not Found |

### 📋 Дополнительные проблемы

При попытке использовать JSON Schema:
- ❌ `responseSchema` не принимает стандартный JSON Schema
- ❌ Не поддерживает: `$schema`, `$id`, `additionalProperties`, `pattern`, `minLength`, `allOf`
- ✅ Поддерживает только: `type`, `properties`, `items`, `required`, `enum`, `description`

**Реализовали:** Функцию `stripSchemaForGemini()` для очистки схемы от неподдерживаемых полей.

**Но:** Не помогло, так как модели вообще недоступны.

### 🛠️ Возможные причины проблемы

1. **API ключ недействителен** — хотя формат правильный
2. **Регион заблокирован** — Gemini API может быть недоступен в некоторых регионах
3. **Проект не активирован** — нужно включить Gemini API в Google Cloud Console
4. **Версия SDK** — возможно, несовместимость версий
5. **API endpoint** — используем `v1beta`, возможно нужен другой

### ✅ Рекомендации для исправления

1. **Проверить API ключ:**
   - Перейти на https://aistudio.google.com/app/apikey
   - Проверить статус ключа
   - Попробовать создать новый ключ

2. **Проверить доступность API:**
   - Зайти в Google AI Studio: https://aistudio.google.com/
   - Попробовать сгенерировать текст прямо в интерфейсе
   - Проверить, какие модели доступны

3. **Проверить регион:**
   - Gemini API может быть недоступен в некоторых странах
   - Попробовать через VPN (если применимо)

4. **Обновить SDK:**
   ```bash
   npm update @google/generative-ai
   ```

5. **Попробовать другой аккаунт:**
   - Создать новый Google аккаунт
   - Получить новый API ключ

---

## 📈 Выводы и следующие шаги

### Что работает
✅ **Groq провайдер подключен и работает**
- Быстрые ответы
- Понимает процессы
- Генерирует JSON

### Что НЕ работает
❌ **Gemini API недоступен**
- Нужна диагностика API ключа
- Возможны проблемы с регионом/доступом

⚠️ **Groq не следует JSON Schema**
- Генерирует неправильные названия полей
- Структура данных отличается от ожидаемой

### Приоритеты на следующий день

#### 1️⃣ Высокий приоритет: Улучшить Groq промпт
**Задача:** Заставить Groq генерировать правильный формат

**Действия:**
- [ ] Обновить system prompt с примерами
- [ ] Явно указать названия полей: `label`, `lane`, `next`, `branches`
- [ ] Добавить JSON Schema прямо в промпт (как пример)
- [ ] Протестировать результаты

**Ожидаемый результат:** Groq генерирует DSL, который проходит валидацию

#### 2️⃣ Средний приоритет: Починить Gemini
**Задача:** Разобраться почему Gemini API не работает

**Действия:**
- [ ] Проверить API ключ в Google AI Studio
- [ ] Попробовать создать новый ключ
- [ ] Проверить доступность в регионе
- [ ] Найти документацию по правильным названиям моделей
- [ ] Протестировать через Google AI Studio web interface

#### 3️⃣ Низкий приоритет: Протестировать OpenAI
**Задача:** Получить OpenAI ключ и протестировать

**Действия:**
- [ ] Зарегистрироваться в OpenAI (если еще нет)
- [ ] Получить API ключ
- [ ] Протестировать OpenAI провайдер
- [ ] Сравнить качество с Groq

### Технические заметки

**Файлы, которые изменились:**
- `packages/parser/src/providers/groq.ts` — обновлена модель на `llama-3.3-70b-versatile`
- `packages/parser/src/providers/gemini.ts` — добавлена функция `stripSchemaForGemini()`, перебраны модели

**Коммиты для истории:**
```bash
git add packages/parser/src/providers/groq.ts
git commit -m "fix: update Groq model to llama-3.3-70b-versatile"

git add packages/parser/src/providers/gemini.ts
git commit -m "wip: add Gemini schema cleanup (API still not working)"
```

---

## 🔗 Полезные ссылки

### Groq
- Документация: https://console.groq.com/docs/quickstart
- Модели: https://console.groq.com/docs/models
- API Keys: https://console.groq.com/keys
- Deprecations: https://console.groq.com/docs/deprecations

### Gemini
- Google AI Studio: https://aistudio.google.com/
- API Keys: https://aistudio.google.com/app/apikey
- Документация: https://ai.google.dev/docs
- Quickstart: https://ai.google.dev/gemini-api/docs/quickstart?lang=node

### Проект
- Наша документация: [docs/ai-providers/README.md](../../process-core-proto/docs/ai-providers/README.md)
- Groq setup: [docs/ai-providers/groq.md](../../process-core-proto/docs/ai-providers/groq.md)
- Gemini setup: [docs/ai-providers/gemini.md](../../process-core-proto/docs/ai-providers/gemini.md)

---

## 📝 Личные заметки

### Groq: Первые впечатления
- **Скорость:** Впечатляет! 1-2 секунды на генерацию
- **Качество:** Понимает логику процесса, но не следует схеме
- **JSON mode vs JSON Schema:** Большая разница — JSON mode просто просит JSON, но не валидирует структуру

### Gemini: Разочарование
- Потратили много времени на попытки подключить
- Непонятно почему модели недоступны
- Документация Google не очень помогла
- Возможно, проблема в регионе или типе аккаунта

### Что понял про AI провайдеры
1. **JSON mode ≠ JSON Schema** — это важно понимать!
2. **Разные провайдеры — разные quirks** — нужно адаптировать промпты
3. **Repair loop критичен** — без него сложно получить правильный формат
4. **Примеры в промпте помогают** — нужно добавлять конкретные примеры

---

**Статус:** 🟡 Частично успешно  
**Следующий шаг:** Улучшить промпт для Groq
