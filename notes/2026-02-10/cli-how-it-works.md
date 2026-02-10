# 🚀 Как работает process-core-proto/src/cli.ts

**Дата:** 2026-02-10  
**Файл:** `process-core-proto/src/cli.ts`

---

## 📋 Содержание

1. [Запуск команды Node.js](#запуск-команды-nodejs)
2. [Shebang и импорты](#shebang-и-импорты)
3. [Точка входа — main()](#точка-входа--main)
4. [Парсинг аргументов командной строки](#парсинг-аргументов-командной-строки)
5. [Функция processExtract() — repair loop](#функция-processextract--repair-loop)
6. [Полная схема вызовов](#полная-схема-вызовов)
7. [Exit codes](#exit-codes)

---

## 1️⃣ Запуск команды Node.js

### Команда
```bash
node dist/src/cli.js process:extract "Школа государственная? если да — проверка департаментом, если нет — автопроверки. Потом решение."
```

### Что происходит
```
1. Node.js запускается
2. Загружает файл dist/src/cli.js
3. Начинает выполнение с первой строки
4. Выполняет импорты
5. Определяет функции
6. Запускает 'await main()' (строка 102)
```

---

## 2️⃣ Shebang и импорты

### Строка 1: Shebang
```typescript
#!/usr/bin/env node
```

**Зачем:** Позволяет запускать файл напрямую без `node`
```bash
# Вместо: node dist/src/cli.js ...
# Можно:  ./dist/src/cli.js ...  (если chmod +x выполнен)
```

**Как работает:**
- `#!` (shebang) говорит ОС: "это исполняемый скрипт"
- `/usr/bin/env node` находит Node.js в PATH и запускает его
- TypeScript компилирует это в обычный комментарий в JavaScript

---

### Строки 2-3: Импорты

```typescript
import { Parser, MockAiProvider } from "../packages/parser/src/index.js";
import { proposalToSpec, validateSpecV1, normalizeSpec, dumpProcessYaml } 
  from "../packages/process-core/src/index.js";
```

**Загружаются модули:**

**Из Parser (Process Layer):**
- `Parser` — класс для работы с AI
- `MockAiProvider` — моковая реализация AI (без сети)

**Из Process Core (Core Layer):**
- `proposalToSpec` — преобразует ответ AI (массивы) в спецификацию (объекты)
- `validateSpecV1` — валидатор семантики DSL
- `normalizeSpec` — нормализация (сортировка lanes/steps)
- `dumpProcessYaml` — генерация YAML из spec

---

## 3️⃣ Точка входа — main()

### Строка 102: Запуск
```typescript
await main();
```

**Последовательность:**
1. Node.js выполняет все импорты
2. Определяет функции: `printHelp()`, `formatIssues()`, `processExtract()`, `main()`
3. **Вызывает `main()`** ← вот тут всё начинается!
4. `await` — ждёт завершения асинхронной функции

---

## 4️⃣ Парсинг аргументов командной строки

### Функция main() (строки 82-100)

```typescript
async function main() {
  const [, , cmd, ...rest] = process.argv;
  if (!cmd || cmd === "-h" || cmd === "--help") return printHelp();

  if (cmd === "process:extract") {
    const userText = rest.join(" ").trim();
    if (!userText) {
      console.error("Missing free text.");
      process.exitCode = 1;
      return;
    }
    await processExtract(userText);  // 👈 ГЛАВНЫЙ МЕТОД!
    return;
  }

  console.error(`Unknown command: ${cmd}`);
  printHelp();
  process.exitCode = 1;
}
```

---

### 📊 Парсинг process.argv

**process.argv** — массив аргументов командной строки:

```javascript
// Команда:
// node dist/src/cli.js process:extract "Школа государственная?..."

process.argv = [
  '/path/to/node',              // [0] - путь к исполняемому файлу Node.js
  '/path/to/dist/src/cli.js',   // [1] - путь к запущенному скрипту
  'process:extract',            // [2] - первый аргумент (команда)
  'Школа государственная?...'   // [3] - второй аргумент (текст)
]
```

**Деструктуризация:**
```typescript
const [, , cmd, ...rest] = process.argv;
//     ^  ^  ^    ^
//     |  |  |    └─ остальные аргументы → ['Школа государственная?...']
//     |  |  └────── третий элемент → 'process:extract'
//     |  └───────── второй пропускаем (путь к скрипту)
//     └──────────── первый пропускаем (путь к node)
```

**Результат:**
- `cmd = 'process:extract'`
- `rest = ['Школа государственная?...']`

---

### 🔀 Логика ветвления в main()

```typescript
// Шаг 1: Проверка на help
if (!cmd || cmd === "-h" || cmd === "--help") {
  return printHelp();  // Выводит справку и выходит
}

// Шаг 2: Команда process:extract?
if (cmd === "process:extract") {
  const userText = rest.join(" ").trim();  // ["Школа...", "..."] → "Школа..."
  
  if (!userText) {
    console.error("Missing free text.");
    process.exitCode = 1;  // Exit code для ОС
    return;
  }
  
  await processExtract(userText);  // 👈 ГЛАВНЫЙ МЕТОД!
  return;
}

// Шаг 3: Неизвестная команда
console.error(`Unknown command: ${cmd}`);
printHelp();
process.exitCode = 1;
```

---

## 5️⃣ Функция processExtract() — repair loop

### Основная логика (строки 18-79)

Это **сердце CLI** — здесь происходит вся магия генерации и валидации.

### 📋 Структура repair loop

```
┌──────────────────────────────────────────────┐
│  1. Попытка генерации (Parser + AI)         │
│  2. Валидация семантики (Validator)          │
│  3. Если ОК → YAML                           │
│  4. Если НЕ ОК → повтор с ошибками (repair)  │
│  5. Финальная валидация                      │
└──────────────────────────────────────────────┘
```

---

### Шаг 1: Создание Parser + первая попытка

```typescript
async function processExtract(userText: string) {
  // Создаём Parser с моковым AI провайдером
  const parser = new Parser(new MockAiProvider());

  // Attempt 1 - первая попытка генерации
  const out1 = await parser.run<any>({
    contractId: "process.v1.extract",  // какой контракт использовать
    userText,                          // наш текст "Школа государственная?..."
  });
```

**Что происходит внутри `parser.run()`:**

```typescript
// Интерфейс ParserInput
{
  contractId: string;      // "process.v1.extract"
  userText: string;        // "Школа государственная?..."
  issues?: Array<{         // опционально для repair loop
    code: string;
    message: string;
    path?: string;
  }>;
}
```

**Внутри Parser.run():**
1. `loadContract(contractId)` — загружает контракт из registry
   - system промпт
   - user промпт (с плейсхолдером `${userText}`)
   - путь к JSON Schema
2. `readJsonSchema(schemaPath)` — читает JSON Schema файл
3. Формирует prompt, подставляя `userText`
4. Вызывает `MockAiProvider.runStructured()` — генерирует JSON
5. Проверяет ответ по JSON Schema (AJV валидация)
6. Возвращает `ParserOutput<T>`

**ParserOutput структура:**
```typescript
{
  ok: boolean;              // успех/провал
  data?: T;                 // данные если ok=true
  meta: {
    provider: string;       // "mock"
    model?: string;         // "gpt-4" и т.д.
    contractId: string;     // "process.v1.extract"
    promptVersion: string;  // "1.0.0"
    confidence?: number;    // 0.0-1.0
    assumptions?: string[]; // что AI додумал
  };
  rawText?: string;         // сырой ответ AI
  error?: {
    kind: "contract" | "provider";
    message: string;
  };
}
```

---

### Шаг 2: Проверка результата Parser

```typescript
  if (!out1.ok || !out1.data) {
    console.error("Parser failed:");
    console.error(out1.error?.message ?? "unknown");
    if (out1.rawText) console.error("Raw:", out1.rawText);
    process.exitCode = 2;  // Exit code = 2 (Parser провалился)
    return;                 // Выходим, ничего не генерируем
  }
```

**Когда Parser.ok = false?**
- AI вернул невалидный JSON
- JSON не соответствует JSON Schema (contract error)
- Провайдер выбросил исключение (network error и т.д.)

---

### Шаг 3: Преобразование proposal → spec

```typescript
  // out1.data = { entry: "...", lanes: [...], steps: [...] }
  // Это proposal формат (массивы) — так AI удобнее генерировать
  
  const spec1 = proposalToSpec(out1.data);
  // spec1 = { type: "process", version: 1, lanes: {...}, steps: {...} }
  // Теперь это ProcessSpecV1 (объекты) — так удобнее валидировать
```

**Что делает `proposalToSpec()`:**

```typescript
// ДО (proposal от AI):
{
  entry: "start",
  lanes: [
    { id: "lane_1", label: "Lane 1" }
  ],
  steps: [
    { id: "start", label: "Start", lane: "lane_1", next: "end" },
    { id: "end", label: "End", lane: "lane_1" }
  ]
}

// ПОСЛЕ (ProcessSpecV1):
{
  type: "process",
  version: 1,
  entry: "start",
  lanes: {                           // массив → объект
    "lane_1": "Lane 1"
  },
  steps: {                           // массив → объект
    "start": { label: "Start", lane: "lane_1", next: "end" },
    "end": { label: "End", lane: "lane_1" }
  }
}
```

**Зачем преобразование?**
- AI проще генерировать массивы (каждый элемент самодостаточен)
- Validator удобнее работать с объектами (быстрый доступ по ключу)
- ProcessSpecV1 содержит `type` и `version` для совместимости

---

### Шаг 4: Валидация семантики (Core Validator)

```typescript
  const v1 = validateSpecV1(spec1, { forbidCycles: true });
  // v1 = { ok: boolean, issues: ValidationIssue[] }
```

**Что проверяет Validator:**

✅ **Базовые свойства:**
- `type === "process"`
- `version === 1`

✅ **Ссылочная целостность:**
- `entry` ссылается на существующий step
- Каждый `step.lane` ссылается на существующий lane
- Каждый `step.next` ссылается на существующий step
- Каждый `branch.to` ссылается на существующий step

✅ **Обязательные поля:**
- Каждый step имеет `label` (не пустой)
- Каждый step имеет `lane`

✅ **Конфликты:**
- Шаг НЕ может иметь одновременно `next` и `branches`

✅ **Дубликаты (warning):**
- В `branches` нет дублирующихся условий `when`

✅ **Достижимость (reachability):**
- Все steps достижимы от `entry` точки

✅ **Ацикличность (опционально):**
- Нет циклов в графе переходов (если `forbidCycles: true`)

**ValidationResult структура:**
```typescript
{
  ok: boolean,              // true если нет errors
  issues: [
    {
      severity: "error" | "warn",
      code: "entry_missing" | "lane_unknown" | "unreachable" | ...,
      message: "Описание проблемы",
      path?: "steps.school_is_public.branches[0].to",  // JSONPath
      stepId?: "school_is_public"                       // для фильтрации
    }
  ]
}
```

---

### Шаг 5: Успех на первой попытке ✅

```typescript
  if (v1.ok) {
    const normalized = normalizeSpec(spec1);  // сортировка lanes/steps
    console.log(dumpProcessYaml(normalized)); // вывод YAML
    return;                                   // 🎉 Готово!
  }
```

**Если валидация прошла (v1.ok === true):**

1. **Нормализация** (`normalizeSpec`):
   - Сортирует lanes алфавитно
   - Сортирует steps алфавитно
   - Гарантирует консистентный вывод YAML

2. **Генерация YAML** (`dumpProcessYaml`):
   ```yaml
   type: process
   version: 1
   entry: school_is_public
   lanes:
     lane_1: Lane 1
   steps:
     decision:
       label: Решение
       lane: lane_1
     school_is_public:
       label: Школа государственная?
       lane: lane_1
       branches:
         - when: да
           to: path_yes
         - when: нет
           to: path_no
   ```

3. **Вывод в stdout** → пользователь видит результат

4. **Exit code = 0** (по умолчанию)

---

### Шаг 6: Repair Loop — попытка исправить ошибки 🔧

```typescript
  // Валидация НЕ прошла (v1.ok === false) → начинаем repair loop
  
  // Фильтруем только errors (warnings не передаём AI)
  const issuesForModel = v1.issues
    .filter(i => i.severity === "error")
    .map(i => ({
      code: i.code,
      message: i.message,
      path: i.path
    }));
```

**Что происходит:**
- Берём только `severity === "error"` (warnings игнорируем)
- Убираем поле `stepId` (не нужно AI)
- Формируем минимальный список ошибок для передачи в промпт

**Пример issuesForModel:**
```json
[
  {
    "code": "entry_missing",
    "message": "spec.entry must reference an existing step id",
    "path": "entry"
  },
  {
    "code": "next_unknown",
    "message": "Unknown step 'nonexistent_step'",
    "path": "steps.start.next"
  }
]
```

---

### Шаг 7: Вторая попытка с передачей ошибок

```typescript
  const out2 = await parser.run<any>({
    contractId: "process.v1.extract",
    userText,              // тот же текст
    issues: issuesForModel // 👈 ПЕРЕДАЁМ ОШИБКИ!
  });
```

**Что происходит в Parser.run():**

1. Загружает тот же контракт
2. Подставляет `userText` в промпт
3. **Добавляет секцию с ошибками** (если `issues` переданы):

```typescript
const prompt = contract.prompt.replace("${userText}", input.userText)
  + (input.issues?.length ? `\n\nValidator issues to fix:\n${JSON.stringify(input.issues, null, 2)}\n` : "");
```

**Итоговый промпт для AI:**
```
User input (free text):
```
Школа государственная? если да — проверка департаментом, если нет — автопроверки. Потом решение.
```

Return ONLY the JSON object that matches the schema.

Validator issues to fix:
[
  {
    "code": "entry_missing",
    "message": "spec.entry must reference an existing step id",
    "path": "entry"
  }
]
```

**AI видит:**
- Оригинальный текст пользователя
- Список ошибок валидации
- Может скорректировать ответ

---

### Шаг 8: Проверка второй попытки

```typescript
  if (!out2.ok || !out2.data) {
    console.error("Parser retry failed:");
    console.error(out2.error?.message ?? "unknown");
    console.error("Validator issues:");
    console.error(formatIssues(v1.issues));  // показываем оригинальные ошибки
    process.exitCode = 3;  // Exit code = 3 (retry провалился)
    return;
  }
```

**Если Parser снова провалился (out2.ok === false):**
- Выводим сообщение "Parser retry failed"
- Показываем ошибку Parser
- Показываем оригинальные validator issues (для контекста)
- Устанавливаем **exit code = 3**
- Прерываем выполнение (больше попыток нет)

**formatIssues() — форматирование для вывода:**
```typescript
function formatIssues(issues: any[]) {
  return issues.map(i => 
    `- [${i.severity}] ${i.code}: ${i.message}${i.path ? ` (${i.path})` : ""}`
  ).join("\n");
}

// Вывод:
// - [error] entry_missing: spec.entry must reference an existing step id (entry)
// - [warn] unreachable: Step 'orphan' is unreachable from entry (steps.orphan)
```

---

### Шаг 9: Валидация второй попытки

```typescript
  const spec2 = proposalToSpec(out2.data);
  const v2 = validateSpecV1(spec2, { forbidCycles: true });

  if (!v2.ok) {
    console.error("Still invalid after retry. Issues:");
    console.error(formatIssues(v2.issues));
    process.exitCode = 4;  // Exit code = 4 (валидация не прошла после retry)
    return;
  }
```

**Если валидация всё ещё не прошла (v2.ok === false):**
- Выводим "Still invalid after retry"
- Показываем **новые** issues (v2.issues, не v1)
- Устанавливаем **exit code = 4**
- Сдаёмся (стратегия: только 2 попытки)

**Почему только 2 попытки?**
- Прототип: простая стратегия
- Избегаем бесконечных циклов
- Для продакшена можно сделать адаптивную стратегию:
  - Счётчик попыток
  - Отслеживание прогресса (errors уменьшаются?)
  - Early exit если ошибки повторяются

---

### Шаг 10: Успех после retry ✅

```typescript
  const normalized2 = normalizeSpec(spec2);
  console.log(dumpProcessYaml(normalized2));
  // 🎉 Готово! Exit code = 0
}
```

**Если вторая попытка успешна (v2.ok === true):**
1. Нормализуем spec2
2. Генерируем YAML
3. Выводим в stdout
4. Exit code = 0 (успех)

---

## 6️⃣ Полная схема вызовов

```
┌─────────────────────────────────────────────────────────┐
│ $ node dist/src/cli.js process:extract "текст"         │
└───────────────────────┬─────────────────────────────────┘
                        │
                    ┌───▼────┐
                    │ main() │ (строка 82)
                    └───┬────┘
                        │
        ┌───────────────┴─────────────────┐
        │ Парсинг process.argv            │
        │ cmd = "process:extract"         │
        │ rest = ["текст"]                │
        │ userText = rest.join(" ")       │
        └───────────────┬─────────────────┘
                        │
              ┌─────────▼──────────┐
              │ processExtract()   │ (строка 18)
              └─────────┬──────────┘
                        │
        ┌───────────────┴────────────────────────┐
        │ 1️⃣ new Parser(new MockAiProvider())    │
        └───────────────┬────────────────────────┘
                        │
        ┌───────────────▼────────────────────────┐
        │ 2️⃣ parser.run({ contractId, userText }) │
        │    ├─ loadContract(contractId)         │
        │    ├─ readJsonSchema(schemaPath)       │
        │    ├─ MockAiProvider.runStructured()   │
        │    └─ AJV validation (JSON Schema)     │
        │    → ParserOutput<T>                   │
        └───────────────┬────────────────────────┘
                        │
        ┌───────────────▼────────────────────────┐
        │ 3️⃣ Check out1.ok?                       │
        └───┬───────────────────┬────────────────┘
           NO                  YES
            │                   │
    ┌───────▼────────┐  ┌───────▼────────────────┐
    │ Exit code = 2  │  │ 4️⃣ proposalToSpec()     │
    │ ❌ Parser fail  │  │   (массивы → объекты)  │
    └────────────────┘  └───────┬────────────────┘
                                │
                ┌───────────────▼────────────────────┐
                │ 5️⃣ validateSpecV1(spec1, {…})      │
                │    Семантическая проверка:         │
                │    • entry exists?                 │
                │    • lanes/steps valid?            │
                │    • references correct?           │
                │    • reachability?                 │
                │    • no cycles?                    │
                │    → ValidationResult              │
                └───────────────┬────────────────────┘
                                │
                    ┌───────────┴───────────┐
                    │ v1.ok?                │
                    └───┬───────────────┬───┘
                      YES             NO
                        │               │
            ┌───────────▼────┐  ┌───────▼────────────────────┐
            │ 6️⃣ normalizeSpec │  │ 7️⃣ Repair Loop              │
            │    dumpYaml      │  │   Filter errors only       │
            │    console.log   │  │   issuesForModel = [...]   │
            │ ✅ Exit code = 0  │  └───────┬────────────────────┘
            └──────────────────┘          │
                                ┌─────────▼──────────────────────┐
                                │ 8️⃣ parser.run({                 │
                                │      contractId, userText,     │
                                │      issues ← передаём ошибки │
                                │    })                          │
                                │    → ParserOutput<T>           │
                                └─────────┬──────────────────────┘
                                          │
                                ┌─────────▼──────────────┐
                                │ 9️⃣ Check out2.ok?       │
                                └───┬─────────────┬──────┘
                                   NO           YES
                                    │             │
                        ┌───────────▼────┐  ┌────▼──────────────┐
                        │ Exit code = 3  │  │ 🔟 proposalToSpec() │
                        │ ❌ Retry fail   │  │    validateSpecV1()│
                        └────────────────┘  └────┬───────────────┘
                                                 │
                                        ┌────────▼────────┐
                                        │ v2.ok?          │
                                        └────┬───────┬────┘
                                           YES     NO
                                            │       │
                                ┌───────────▼────┐  ┌──────▼──────────┐
                                │ normalize      │  │ Exit code = 4   │
                                │ dumpYaml       │  │ ❌ Still invalid │
                                │ console.log    │  └─────────────────┘
                                │ ✅ Exit code=0  │
                                └────────────────┘
```

---

## 7️⃣ Exit Codes

### Коды завершения

| Exit Code | Значение | Когда происходит |
|-----------|----------|------------------|
| **0** | Успех | DSL сгенерирован и валиден (попытка 1 или 2) |
| **1** | Неверный ввод | Неизвестная команда или отсутствует текст |
| **2** | Parser failed | Parser провалился на первой попытке |
| **3** | Retry failed | Parser провалился на второй попытке (после repair) |
| **4** | Still invalid | Validator отклонил DSL после retry |

### Как устанавливается exit code

```typescript
process.exitCode = 2;  // устанавливаем код
// Node.js запоминает код
// При завершении процесса возвращает его в ОС
```

### Проверка в терминале

**Linux/Mac:**
```bash
node dist/src/cli.js process:extract "текст"
echo $?  # выведет exit code (например, 0)
```

**Windows PowerShell:**
```powershell
node dist/src/cli.js process:extract "текст"
echo $LASTEXITCODE  # выведет exit code
```

**Windows CMD:**
```cmd
node dist\src\cli.js process:extract "текст"
echo %ERRORLEVEL%  # выведет exit code
```

---

## 💡 Ключевые моменты

### 1. Асинхронность

```typescript
async function main() { /* ... */ }
await main();
```

- `async` — функция возвращает Promise
- `await parser.run()` — ждём ответа AI (асинхронная операция)
- `await main()` — top-level await (ES modules)

### 2. Двухэтапная валидация

```
Parser (строка 23):             Core Validator (строка 37):
├─ JSON Schema validation       ├─ Semantic validation
├─ Синтаксис JSON               ├─ Логика DSL
├─ Структура по контракту       ├─ Ссылочная целостность
└─ AJV библиотека               └─ Достижимость, циклы
```

**Зачем два уровня?**
- Parser проверяет: "AI вернул то, что обещал" (контракт)
- Validator проверяет: "DSL имеет смысл" (семантика)

### 3. Repair Loop стратегия

**Текущая реализация:**
- ✅ Только **2 попытки** (не бесконечно)
- ✅ Передаём **только errors** (warnings игнорируем)
- ✅ Второй вызов с **теми же данными + issues**
- ✅ Явная обратная связь (issues в JSON)

**Почему не больше попыток?**
- Прототип: простая стратегия
- Если 2 попытки не помогли → проблема глубже (плохой промпт, некорректный текст)
- Для продакшена: адаптивная стратегия с метриками

### 4. Детерминизм

**Детерминированные компоненты:**
- `proposalToSpec()` — чистая функция
- `validateSpecV1()` — всегда один результат для одного входа
- `normalizeSpec()` — сортировка по алфавиту
- `dumpProcessYaml()` — консистентная сериализация

**Недетерминированный компонент:**
- `Parser` → зависит от AI (MockAiProvider детерминирован, реальный AI — нет)

**Принцип:** Core Layer детерминирован, Process Layer может быть недетерминирован.

### 5. Разделение ответственности

```typescript
CLI (src/cli.ts):           Parser (packages/parser):
├─ Оркестрация             ├─ AI взаимодействие
├─ Repair loop логика      ├─ Contract loading
├─ Exit codes              ├─ JSON Schema validation
└─ Вывод результата        └─ Provider abstraction

                           Core (packages/process-core):
                           ├─ Semantic validation
                           ├─ Normalization
                           ├─ Type definitions
                           └─ YAML generation
```

**Граница ответственности:**
- CLI не знает как работает AI
- Parser не знает про repair loop
- Core не знает про AI вообще

---

## 🎓 Инсайты

### 1. process.argv деструктуризация — идиома Node.js

```typescript
const [, , cmd, ...rest] = process.argv;
```

Стандартный способ парсинга аргументов в Node.js CLI.

### 2. Exit codes — контракт с ОС

```typescript
process.exitCode = 2;
```

Позволяет shell скриптам проверять успех/провал:
```bash
if node cli.js process:extract "text"; then
  echo "Success!"
else
  echo "Failed with code $?"
fi
```

### 3. Repair loop должен быть тупым

CLI **не знает** как исправить ошибки.  
CLI **только передаёт** issues обратно в Parser.  
**Исправление — задача AI**, не оркестратора.

### 4. Типы первичны

```
Proposal (от AI) → ProcessSpecV1 (для Validator) → YAML (для пользователя)
```

Источник истины: **TypeScript типы** (`ProcessSpecV1`).  
Форматы (proposal, YAML) — представления.

### 5. YAGNI в действии

- Нет сложных абстракций
- Нет паттернов "на будущее"
- Простые функции + типы
- **700 строк** достаточно для proof-of-concept

---

## 📚 Связанные файлы

### Импортируемые модули

**Parser:**
- `packages/parser/src/parser.ts` — класс Parser
- `packages/parser/src/types.ts` — ParserInput, ParserOutput, AiProvider
- `packages/parser/src/contracts/registry.ts` — loadContract, readJsonSchema
- `packages/parser/src/providers/mock.ts` — MockAiProvider

**Process Core:**
- `packages/process-core/src/fromProposal.ts` — proposalToSpec
- `packages/process-core/src/validate.ts` — validateSpecV1
- `packages/process-core/src/normalize.ts` — normalizeSpec
- `packages/process-core/src/yaml.ts` — dumpProcessYaml
- `packages/process-core/src/types.ts` — ProcessSpecV1, ValidationResult

**Контракты:**
- `contracts/process.v1.extract.schema.json` — JSON Schema для AI ответа

---

## 🚀 Следующие шаги для улучшения

### 1. Адаптивный repair loop
```typescript
// Вместо фиксированных 2 попыток:
const maxRetries = 3;
let attempt = 0;
while (!valid && attempt < maxRetries) {
  // проверять прогресс (errors уменьшаются?)
  // early exit если ошибки повторяются
}
```

### 2. Типизация proposal
```typescript
// Сгенерировать типы из JSON Schema
interface ProcessProposalV1 {
  entry: string;
  lanes: Array<{ id: string; label: string }>;
  steps: Array<{ id: string; label: string; /* ... */ }>;
}

// Использовать вместо any
const out1 = await parser.run<ProcessProposalV1>({ /* ... */ });
```

### 3. Логирование и трассировка
```typescript
// Для отладки и метрик
console.error(`[DEBUG] Attempt 1: Parser returned ok=${out1.ok}`);
console.error(`[DEBUG] Validator found ${v1.issues.length} issues`);
```

### 4. Конфигурируемость
```typescript
// Вынести в config
const config = {
  maxRetries: 2,
  forbidCycles: true,
  passWarnings: false  // передавать ли warnings в repair loop
};
```

---

**Статус:** Документация актуальна для версии 0.0.1 ✅
