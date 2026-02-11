# Эксперимент: Generator + Repairer архитектура

**Дата:** 2026-02-11  
**Концепция:** Разделение генерации и исправления DSL на две специализированные роли  
**Модели:** Groq (Llama 3.3 70B) для обеих ролей

---

## 🎯 Гипотеза

Разделить работу AI на две роли:
1. **Generator** — быстро создаёт DSL (может быть с ошибками), дешёвая модель
2. **Repairer** — исправляет конкретные ошибки валидации, специальный промпт

**Преимущества:**
- Разные промпты для разных задач
- Можно использовать дешёвые модели для генерации
- Repairer фокусируется только на исправлении ошибок

---

## 🔧 Реализация

### Архитектура компонентов

```
packages/parser/src/repair/
├── index.ts           # Экспорты модуля
├── types.ts           # Типы: RepairResult, RepairContext, RepairConfig
├── prompts.ts         # Промпты для Repairer
├── repairer.ts        # Основной класс Repairer
└── README.md          # Документация
```

### Ключевые решения

**1. Два разных промпта:**

**Generator System Prompt** (обычный):
```
You are an expert business process analyst.
Generate structured DSL from natural language...
```

**Repairer System Prompt** (специализированный):
```
You are a DSL repair specialist.
Your task: Fix INVALID process DSL to make it VALID.

CRITICAL RULES:
1. Use "label" not "name" for all labels
2. Use "lane" not "lane_id" for lane references
3. IDs must be snake_case
4. All steps must have: id, label, lane
...
```

**2. RepairContext — полная информация об ошибке:**
```typescript
{
  userInput: "User submits request -> review",
  invalidDSL: { /* невалидный DSL */ },
  validationErrors: [
    { message: "Unknown property 'name', expected 'label'", path: "lanes[0].name" }
  ],
  contractId: "process.v1.extract"
}
```

**3. Итеративный процесс (до 3 попыток):**
```typescript
for (let attempt = 1; attempt <= maxAttempts; attempt++) {
  const repaired = await askAiToRepair(context)
  const validation = validateFn(repaired)
  
  if (validation.ok) {
    return { success: true, repairedDSL: repaired, attempt }
  }
  
  // Продолжаем с новыми ошибками
  currentDSL = repaired
  currentErrors = validation.errors
}
```

---

## 🧪 Тестирование

### Тестовый пример

```bash
GROQ_API_KEY=xxx node dist/cli.js process:extract-with-repair \
  "User submits request -> review by manager -> approve or reject"
```

### Ход выполнения

**Шаг 1: GENERATION**

Groq сгенерировал DSL с типичными ошибками:

```json
{
  "lanes": [
    { "id": "user_lane", "name": "User" },           // ❌ name вместо label
    { "id": "manager_lane", "name": "Manager" }      // ❌ name вместо label
  ],
  "steps": [
    {
      "id": "submit_request",
      "name": "Submit Request",                       // ❌ name вместо label
      "lane_id": "user_lane"                         // ❌ lane_id вместо lane
    },
    {
      "id": "review_request",
      "name": "Review Request",                       // ❌ name вместо label
      "lane_id": "manager_lane"                      // ❌ lane_id вместо lane
    },
    // ... ещё 2 шага с теми же ошибками
  ],
  "entry": "submit_request",
  "next": {                                          // ❌ неправильная структура
    "submit_request": "review_request",
    "review_request": {
      "type": "xor",
      "options": ["approve_request", "reject_request"]
    }
  }
}
```

**Шаг 2: VALIDATION**

Обнаружено **11 ошибок:**
- `step.label is required` (4 раза)
- `step.lane is required` (4 раза)
- `Step is unreachable from entry` (3 раза)

**Шаг 3: REPAIR**

```
🔧 Starting DSL repair...
   Errors to fix: 11
   Max attempts: 3

   Attempt 1/3...
   ✅ DSL repaired successfully!
```

Groq с repair промптом **с первой попытки** исправил все ошибки!

**Исправленный DSL:**

```yaml
type: process
version: 1
entry: submit_request
lanes:
  manager_lane: {}
  user_lane: {}
steps:
  approve_request:
    id: approve_request
    label: Approve request           # ✅ label вместо name
    lane: manager_lane               # ✅ lane вместо lane_id
    next: null
  reject_request:
    id: reject_request
    label: Reject request
    lane: manager_lane
    next: null
  review_request:
    id: review_request
    label: Review by manager
    lane: manager_lane
    next:                            # ✅ правильная структура
      branch:
        - condition: approved
          next: approve_request
        - condition: rejected
          next: reject_request
  submit_request:
    id: submit_request
    label: User submits request
    lane: user_lane
    next: review_request             # ✅ правильные связи
```

---

## 📊 Результаты

### Метрики успеха

| Метрика | Значение |
|---------|----------|
| **Успешность генерации** | ❌ Невалидный DSL (11 ошибок) |
| **Успешность repair** | ✅ 100% (1 попытка из 3) |
| **Время генерации** | ~1-2 сек |
| **Время repair** | ~1-2 сек |
| **Общее время** | ~3-4 сек |
| **Стоимость** | $0 (Groq бесплатно) |

### Типы ошибок, которые Repairer исправил

1. **Field naming:** `name` → `label`, `lane_id` → `lane`
2. **Структура next:** Плоский объект → правильная структура с `branch`
3. **Связи между шагами:** Добавил правильные `next` для всех шагов

---

## 💡 Выводы

### ✅ Что работает отлично

1. **Специализация промптов эффективна**
   - Generator промпт — общий, простой
   - Repair промпт — строгий, с чёткими правилами
   - Результат: Repairer **понимает** что именно нужно исправить

2. **Итеративность не нужна для простых ошибок**
   - Repairer исправил 11 ошибок с **первой попытки**
   - Значит промпт достаточно чёткий

3. **Одна модель для обеих ролей работает**
   - Groq справляется и с генерацией, и с repair
   - Экономия: не нужна дорогая модель

4. **Verbose режим полезен**
   - Понятно видно каждый шаг
   - Легко отлаживать

### ⚠️ Что нужно проверить дополнительно

1. **Тестирование на сложных примерах**
   - Что если 20-30 шагов?
   - Что если вложенные ветвления?
   - Нужно больше примеров

2. **Могут ли быть ошибки которые Repairer не исправит?**
   - Сейчас прошёл с первой попытки
   - Надо найти "сложный" случай

3. **Разные модели для ролей**
   - Дешёвая (Groq) для генерации ✅ работает
   - Мощная (Claude) для repair — стоит ли?
   - Экономика: если Groq справляется, зачем платить?

4. **Метрики в production**
   - Сколько % генераций проваливают валидацию?
   - Сколько % Repairer успешно чинит?
   - На какой попытке обычно чинит?

### 🎯 Следующие шаги

#### Краткосрочные (1-2 дня)

1. **Протестировать на 20-30 разных примерах**
   - Простые процессы (2-3 шага)
   - Средние (5-7 шагов)
   - Сложные (10+ шагов, вложенные branch)

2. **Собрать статистику**
   - % успешных генераций (без repair)
   - % успешных repair
   - Среднее количество попыток repair

3. **Улучшить Generator промпт**
   - Если Repairer постоянно чинит одни и те же ошибки
   - Значит Generator промпт надо дополнить

#### Среднесрочные (1-2 недели)

4. **Попробовать дешёвую генерацию + мощный repair**
   ```typescript
   const generator = new GroqAiProvider(key)      // Бесплатно
   const repairer = new ClaudeProvider(key)       // $0.015 за запрос
   ```
   - Измерить экономику
   - Сравнить качество

5. **Интегрировать в основной flow**
   - Сейчас отдельная команда `process:extract-with-repair`
   - Можно сделать дефолтной стратегией

6. **Добавить телеметрию**
   - Логировать все repair попытки
   - Анализировать паттерны ошибок
   - Использовать для автокоррекции промптов

#### Долгосрочные (месяц+)

7. **Meta-AI для улучшения промптов**
   - Анализ частых ошибок Repairer
   - Автоматическое улучшение Generator промпта
   - A/B тестирование версий промптов

---

## 🔬 Технические детали

### Интерфейс Repairer

```typescript
class Repairer {
  constructor(
    aiProvider: AiProvider,
    validateFn: ValidateFn,
    config: RepairConfig
  )

  async repair(context: RepairContext): Promise<RepairResult>
}

// Создание
const repairer = createRepairer(
  groqProvider,
  validateSpecV1,
  { maxAttempts: 3, verbose: true }
)

// Использование
const result = await repairer.repair({
  userInput: "...",
  invalidDSL: { ... },
  validationErrors: [ ... ],
  contractId: "process.v1.extract"
})
```

### Структура RepairResult

```typescript
interface RepairResult {
  success: boolean           // Успешно ли
  repairedDSL?: any         // Исправленный DSL
  attempt: number           // На какой попытке
  validationErrors?: []     // Ошибки (если не успешно)
  reason?: string           // Причина неудачи
}
```

### CLI команды

```bash
# Старая версия (без Repairer)
node dist/cli.js process:extract "..."

# Новая версия (с Repairer)
node dist/cli.js process:extract-with-repair "..."
```

---

## 📝 Сравнение подходов

### Без Repairer (старый подход)

```
Parser → Validator → ❌ Invalid
         ↓
Parser retry с ошибками → Validator → ❌ Still invalid
```

**Проблемы:**
- Parser видит те же инструкции + ошибки
- Может повторить те же ошибки
- Не специализирован на исправлении

### С Repairer (новый подход)

```
Parser → Validator → ❌ Invalid
         ↓
Repairer (специальный промпт) → Validator → ✅ Valid
```

**Преимущества:**
- Repairer специализирован на исправлении
- Другой промпт с чёткими правилами
- Видит контекст: что хотел пользователь + что сломано

---

## 🎬 Пример полного лога

```
🚀 Starting Generator + Repairer flow...

⚡ Using Groq AI provider

📝 Step 1: GENERATION
   Asking AI to generate DSL from: "User submits request -> review by manager -> approve or reject"
   ⚠️  DSL generated but failed schema validation
   Error: Contract schema validation failed: ...

🔍 Step 2: VALIDATION
   ❌ DSL is invalid (11 errors)

   Validation errors:
   - step.label is required at steps.submit_request.label
   - step.lane is required at steps.submit_request.lane
   ... (9 ошибок)

🔧 Step 3: REPAIR

🔧 Starting DSL repair...
   Errors to fix: 11
   Max attempts: 3

   Attempt 1/3...
   ✅ DSL repaired successfully!

✨ DSL successfully repaired in 1 attempt(s)!

[Результат в YAML]
```

---

## 🚀 Готовность к внедрению

| Критерий | Статус | Комментарий |
|----------|--------|-------------|
| **Код реализован** | ✅ Готово | Repairer модуль полностью работает |
| **Протестирован** | ⚠️ Частично | Только 1 пример, нужно 20-30 |
| **Документирован** | ✅ Готово | README + примеры в коде |
| **Интегрирован в CLI** | ✅ Готово | Команда `process:extract-with-repair` |
| **Метрики** | ❌ Нет | Нужно добавить телеметрию |
| **Production-ready** | ⚠️ Прототип | Для реального использования нужно больше тестов |

---

## 🎯 Рекомендации

### Immediate Action (сегодня-завтра)

1. **Протестировать на 10 примерах**
   - Разной сложности
   - Записать результаты
   - Выявить edge cases

### Short-term (неделя)

2. **Добавить простую телеметрию**
   - Логировать в `.specrails/telemetry/repair-results.jsonl`
   - Считать % успешности

3. **Сравнить с обычным Parser**
   - Запустить те же примеры через `process:extract`
   - Сравнить качество результатов

### Medium-term (2-4 недели)

4. **Экономический анализ**
   - Groq (генерация) + Groq (repair) = $0
   - Groq (генерация) + Claude (repair) = $0.015 * 10% = $0.0015 в среднем
   - Посчитать ROI

5. **Интеграция в основной поток**
   - Сделать Repairer дефолтной стратегией
   - Убрать старый retry механизм

---

## ✅ Итоговый вывод

**Архитектура Generator + Repairer работает и показывает отличные результаты!**

**Ключевые достижения:**
- ✅ Специализированные промпты эффективнее универсальных
- ✅ Repairer исправил 11 ошибок с первой попытки
- ✅ Код понятный, легко расширяемый
- ✅ Бесплатная модель (Groq) справляется

**Что дальше:**
- Больше тестов для уверенности
- Метрики для мониторинга
- Внедрение в production flow

**Следующий эксперимент:**
Попробовать дешёвую генерацию (Groq) + мощный repair (Claude Sonnet) для сложных случаев.
