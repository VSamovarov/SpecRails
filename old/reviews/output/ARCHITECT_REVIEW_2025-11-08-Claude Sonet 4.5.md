# Архитектурный ревью SpecRails — Оценка согласованности системы

**агент:** архитектор  
**кои:** нет  
**версия:** 1.0  
**дата:** 2025-11-08  
**рецензент:** Системный архитектурный анализ

---

## 1. Резюме (≤ 6 пунктов)

- **Философский фундамент прочен:** Базовый принцип «ядро = DSL generation, AI = инструмент» чётко разделяет ответственность и отличает SpecRails от "AI workspace"
- **Терминологическая фрагментация:** Validator, Context, Contract, Feedback Loop определяются по-разному в Core/Runtime/Governance слоях, создавая когнитивную нагрузку
- **Отсутствует ключевой документ:** `Validation_Loop_Principle.md` упомянут в индексе, но физически отсутствует — критический пробел для понимания цикла валидации
- **Дублирование политик:** Sandbox Policy описана дважды (Security Model + Runtime Manifest) с конфликтующими параметрами
- **Архитектурная связность:** Context Orchestration смешивает governance логику с runtime состоянием, нарушая заявленный принцип изоляции
- **MVP перегружен:** Текущая область охватывает 22 документа; для демонстрабельности достаточно 8–10 компонентов Core + Runtime

---

## 2. Оценки (0–5)

- **согласованность:** 3.5 — Терминология Core/Runtime использует разные названия для идентичных концепций; "Validator" имеет 3 определения
- **реализуемость:** 3.0 — MVP достижим, но требует отложить Observability, продвинутые SDK и полный lifecycle Registry
- **ясность:** 3.5 — Базовые принципы ясны, но границы между Core/Runtime/Governance размыты в практических сценариях
- **избыточность:** 4.0 — Существенное дублирование: Sandbox Policy, Observability Layer (два документа), Preview + Error Recovery описывают пересекающиеся циклы
- **риск:** 3.5 — Технически умеренный, организационно высокий: неясная ответственность за Context Orchestration и Drift Control на разных слоях

---

## 3. Ключевые находки

### [F1] Базовый принцип архитектурно звучен, но операционно расплывчат

**Документ:** `SpecRails_Core_Principle.md`

**Находка:**  
Философия «ядро = DSL generator, AI = инструмент» верна. Таблица разделения ответственности (Core ⊥ Preview ⊥ AI) соответствует best practices.

**Проблема:**  
Документ перечисляет 5 компонентов ядра (Parser, Validator, Assembler, Schema Registry, Output Contracts), но в Runtime документах эти же компоненты упоминаются как части Prompt Execution Runtime и Module Registry. Неясно, кто владеет:
- **Validator Layer** — Core Principle говорит "проверка DSL", Prompt Execution Runtime говорит "проверка AI output по контракту", Error Recovery говорит "генерирует отчёт"
- **Schema Registry** — упомянут как часть Core, но Runtime Manifest управляет schemas контрактов

**Вывод:**  
Нужна чёткая демаркация: Core владеет *статической* валидацией DSL структуры, Runtime владеет *динамической* валидацией AI output.

---

### [F2] Отсутствует канонический документ Validation Loop — семантическая пустота

**Документ:** `DOCUMENTS_INDEX.md` ссылается на `SpecRails_Validation_Loop_Principle.md`, но файл отсутствует в `./docs/`

**Находка:**  
Validation Loop упоминается в:
- Preview Principle (визуальная проверка)
- Error Recovery (цикл автокоррекции AI)
- Prompt Execution Runtime (retry механизм)

Но нигде нет *каноничного* определения:
- Что считается "итерацией" цикла?
- Когда цикл завершается успешно?
- Сколько итераций допустимо?
- Как человеческая обратная связь вписывается в машинный цикл?

**Риск:**  
Разработчики и аналитики будут иметь несогласованное понимание того, когда результат "готов".

---

### [F3] Context Orchestration нарушает принцип изоляции слоёв

**Документ:** `SpecRails_Context_Orchestration_and_Layering_Principle.md`

**Находка:**  
Слой заявляет о себе как "governance layer", но его `final_context` смешивает:

```yaml
final_context:
  constitution: "..." # неизменяемый системный слой
  project: {...}      # конфигурация проекта
  user: {...}         # изменяемые предпочтения
  runtime: {...}      # транзиентное состояние сессии
  ephemeral: {...}    # одноразовые команды
```

**Проблема:**  
- **Constitution** (неизменяемый) и **Runtime state** (изменяемый каждую секунду) находятся в одной структуре
- **Project** (логическая политика) смешивается с **Ephemeral** (временные команды)
- Приоритизация конфликтов неясна: если User preferences противоречит Contract requirement, кто побеждает?

**Последствие:**  
Изменение одного слоя может непредсказуемо влиять на AI output через неочевидные правила приоритета. Нарушает Single Responsibility Principle.

---

### [F4] Sandbox Policy определена дважды с конфликтами

**Документы:** `Security_Model_and_Sandbox_Policy.md` vs. `Runtime_Manifest_and_Module_Registry.md`

**Конфликт:**

| Параметр | Security Model | Runtime Manifest |
|---|---|---|
| `allowed_apis` | `["PromptAPI", "ValidatorAPI"]` | `["PromptAPI", "ValidatorAPI", "ContextAPI"]` |
| `timeout_ms` | Не указан | `5000` |
| `restricted_modules` | `["fs", "net", "child_process"]` | `["fs", "child_process", "http"]` |
| `io_access` | `false` | Не указан |

**Проблема:**  
Какая версия каноническая? Если SDK документ разрешает `ContextAPI`, а Security Model ограничивает — могут ли утилиты читать контекст?

---

### [F5] Prompt Modularity декларирует Loose Coupling, но реализация — Hard Dependency

**Документ:** `SpecRails_Prompt_Modularity_Principle.md`

**Декларация:**  
> "Контракты связаны только через публичные контексты, а не внутренние структуры"

**Реальность:**  
```yaml
- id: form.contract.v2
  depends_on: ["model.contract.v1", "acl.contract.v1"]
```

Это **прямая жёсткая зависимость**. Если `model.contract.v1` изменит выходную схему, `form.contract.v2` сломается молча.

**Отсутствует:**  
- Механизм валидации совместимости между зависимыми контрактами
- Семантическое версионирование зависимостей (major.minor.patch)
- Граф зависимостей и проверка циклических ссылок

---

### [F6] AI Interaction Protocols определяют фреймы сообщений, но не политику восстановления

**Документ:** `SpecRails_AI_Interaction_Protocols_and_Communication_Contracts.md`

**Определено:**  
- Структура запроса/ответа (request/response frames)
- Error codes (E001–E005)

**НЕ определено:**  
- Критерии выбора между "retry" и "switch model"
- Семантика exponential backoff при повторах
- Какая модель AI используется "по умолчанию" vs. "резервная"
- Как версии контрактов согласуются с возможностями AI провайдера (GPT-4 vs. GPT-5)

**Последствие:**  
Runtime должен реализовать эту логику ad-hoc, потенциально нарушая консистентность.

---

### [F7] Observability Layer описана дважды с пересекающейся областью видимости

**Документы:** `Observability_and_Telemetry_Layer.md` + `Operational_Runtime_and_Observability_Layer.md`

**Перекрытие:**  
- Оба говорят о мониторинге модулей
- Оба упоминают Prometheus/Grafana
- Оба определяют метрики AI (drift, success rate)

**НЕ определено:**  
- Где генерируются события телеметрии (Core? Runtime? SDK?)
- Как observability данные возвращаются в governance решения (drift > 5% → автоматический deprecate контракта?)
- Компромисс производительности при логировании всех AI интеракций

**Рекомендация:**  
Объединить в один документ или чётко разделить: Telemetry = сбор данных, Operational = использование данных для решений.

---

### [F8] System Overview заявляет холистичность, но опускает модель персистентности данных

**Документ:** `SpecRails_System_Overview_Final_Architecture_Blueprint.md`

**Показывает:**  
Поток данных: Text → Prompt → AI → DSL → Validation → Preview → CI/CD

**НЕ определяет:**  
- Где хранятся DSL артефакты (локальная FS? git репозиторий? база данных?)
- Как управляются версии DSL (git commits? custom versioning?)
- Как работает коллаборация между аналитиками (merge conflicts в YAML?)
- Какова модель транзакционности при одновременной работе нескольких пользователей?

---

### [F9] Preview + Error Recovery описывают пересекающиеся циклы обратной связи

**Документы:** `Preview_Principle.md` + `Error_Recovery_and_Feedback_Mechanism.md`

**Пересечение:**  
Оба описывают "feedback loop":
- Preview: Human → AI (визуальная обратная связь)
- Error Recovery: Core Validator → AI (машинная коррекция)

**Неясно:**  
- Это один цикл с двумя фазами или два параллельных цикла?
- Когда срабатывает Preview (после каждой итерации Error Recovery или только на финальном валидном DSL)?
- Может ли человек прервать Error Recovery цикл до завершения автокоррекции?

---

### [F10] Runtime Manifest управляет lifecycle модулей, но не контрактов

**Документ:** `Runtime_Manifest_and_Module_Registry.md`

**Управляет:**  
- Версии модулей (utilities, extensions)
- Зависимости между модулями
- Sandbox policies для модулей

**НЕ управляет:**  
- Lifecycle контрактов (Draft → Published → Deprecated)
- Кто ответственен за версионирование контрактов при deployment
- Что происходит, если модуль ссылается на Deprecated контракт?

**Конфликт с:** `Prompt_Registry_and_Lifecycle.md`, который определяет lifecycle контрактов отдельно.

**Нужно:** Установить, что Registry — source of truth для контрактов, Manifest — для модулей. Manifest загружает контракты из Registry при старте.

---

## 4. Противоречия и пробелы

| Где (документ/раздел) | Проблема | Серьёзность | Предложение исправления |
|---|---|---|---|
| Core Principle (¶1) vs. Prompt Execution Runtime (¶1) | Оба владеют "Validator Layer" — один компонент или два? | **high** | Разделить: Core = схема DSL, Runtime = output контракта. Документировать единый интерфейс. |
| Context Orchestration (¶6) vs. AI Protocols (¶5) | Приоритеты слоёв vs. неизменяемость контрактов — конфликт при user context ≠ contract | **high** | Правило: Constitution > Contract > Project > User. Документ "Context Resolution Policy". |
| Security Model (¶3) vs. Runtime Manifest (¶5) | Две разные схемы `sandbox_policy` | **med** | Выбрать одну каноническую. Переместить в Security_Model, Runtime_Manifest ссылается. |
| Validation Loop (отсутствует) | Индекс ссылается, файл отсутствует | **high** | Создать `Validation_Loop_Principle.md` с критериями завершения, max retries, success metrics. |
| Preview (¶2) vs. Error Recovery (¶1) | Оба "feedback loop" — один поток или два? | **med** | Уточнить: Preview = визуальный Human loop, Error Recovery = структурный Machine loop. |
| SDK API (¶2) vs. Security (¶3) | SDK разрешает ContextAPI, Security ограничивает | **med** | Указать, какие слои Context доступны (read-only Constitution + Domain). |
| Prompt Registry (¶2) vs. Runtime Manifest (¶2) | Кто ответствен за версионирование контрактов? | **med** | Registry = истина для контрактов, Manifest = deployed versions. |
| Knowledge Base (¶2) vs. Context Engine (¶4) | Два слоя или один? Hot-reload? | **low** | KB = статичные файлы, Context Engine = runtime кеш. Документировать update semantics. |
| Observability (два документа) | Перекрывающаяся область видимости | **low** | Объединить или разделить: Telemetry = сбор, Operational = использование. |

---

## 5. Рекомендации MVP

### Must-have (прямо сейчас):

- ✅ **Core DSL Engine:** Parser + Schema Validator (text → validated DSL)
- ✅ **Prompt Execution Runtime:** AI invocation + contract binding + единственный retry loop
- ✅ **Context Orchestration (упрощённый):** Только 3 слоя — System (Constitution), Domain (KB), Project. Отложить User/Runtime.
- ✅ **Sandbox Basics:** Изоляция процессов + API whitelist (не продвинутые cpu/memory limits)
- ✅ **Preview Renderer:** Статичный HTML output (без интерактивного edit mode)
- ✅ **Error Recovery:** Автоматический retry с уточнением контракта (без human loop)
- ✅ **Validation Loop Definition:** Один канонический документ с ясными критериями завершения

### Defer (следующий релиз):

- Prompt Registry полный lifecycle (Draft → Review → Published → Deprecated → Archived). Начать с Published + Deprecated.
- Advanced Context Orchestration (User preferences, Runtime state layers). Использовать defaults.
- Полный Observability stack (Prometheus, Grafana, Slack). Логировать в stdout/file.
- CI/CD deep integration (governance policies, drift detection). Manual approval workflow.
- SDK Extension API для третьих сторон. Закрыть на internal use.
- Human Feedback Loop в Preview. Реализовать machine-only autocorrect.

### Remove/merge:

- **Удалить:** Отдельный `Operational_Runtime_and_Observability_Layer.md`. Объединить с `Observability_and_Telemetry_Layer.md`.
- **Объединить:** Preview Principle + Error Recovery в `Validation_Loop_Principle.md` (две фазы одного цикла).
- **Консолидировать:** Security_Model sandbox + Runtime_Manifest sandbox в одну каноническую Sandbox Policy.
- **Уточнить ownership:** Core владеет Validation, Runtime владеет Orchestration, SDK владеет Extensibility (добавить таблицу в System Overview).

---

## 6. Реестр рисков

| Риск | Влияние | Вероятность | Смягчение |
|---|---|---|---|
| **Терминологическая путаница разработчиков** | Переделка, баги, долгий onboarding | HIGH | Глоссарий SpecRails (20 терминов). Проверить все docs на семантическую консистентность. |
| **Context Orchestration связывает Runtime, нарушая изоляцию** | Регресс архитектуры; сложность замены AI | MEDIUM | Формализовать Context Interface как строгий контракт (input/output schemas). Отделить логику от dispatch. |
| **Sandbox policy несоответствие разрешает непредвиденный API доступ** | Уязвимость безопасности | MEDIUM | Выбрать одну каноническую схему. Добавить security тесты для API whitelist. |
| **Validation Loop не определён — система зависает** | Бесконечные циклы; отказ пользователей | HIGH | Документировать с явными критериями (max 3 retries, timeout 5s). Watchdog timer. |
| **Граф зависимостей контрактов не валидируется** | Silent version mismatch в production | MEDIUM | Pre-deployment валидация: trace `depends_on`, verify compatibility. Fail build if mismatch. |
| **Prompt Lifecycle разрешает неоднозначные переходы** | Deprecated контракты используются непреднамеренно | LOW | Transition guards: Deprecated → Active требует re-publish. |
| **SDK API surface без гарантий стабильности** | Third-party интеграции ломаются | MEDIUM | "Stable" APIs (semver) vs. "experimental" (alpha). Promise backward compatibility. |
| **Observability отделена от governance** | Система не авто-отвечает на drift > 5% | LOW | Feedback loop: Observability → Governance → Automation (Фаза 2). |

---

## 7. Предложенные правки (Patch Hints)

### 7.1 Создать отсутствующий Validation Loop Principle

**Файл:** `docs/SpecRails_Validation_Loop_Principle.md`

**Содержимое:**
```markdown
# Принцип Validation Loop

## Определение цикла
Validation Loop: (AI Output) → (Core Validator) → [Pass?]
  → YES: (Cache & Preview)
  → NO: (Feedback Manager) → (AI Repair Loop) → retry

## Критерии завершения
- Max retries = 3 (настраиваемо)
- Timeout = 5 секунд на итерацию
- Success = output проходит schema + core rules
- Failure = после max retries → human escalation

## Фазы
1. **Machine Phase** (Error Recovery): автоматическая, 3 retries
2. **Human Phase** (Preview): опциональная, если машина не справилась
3. **Approval & Cache** (аналитик подписывает или пропускает)

## Метрики
- Success rate (% проходит с первого раза)
- Avg retry depth
- Time to stable result
```

---

### 7.2 Уточнить разделение Core vs. Runtime

**Документ:** `SpecRails_Core_Principle.md`, раздел "Что входит в ядро"

**Добавить таблицу:**

| Компонент | Ответственность | Обоснование |
|---|---|---|
| Core DSL Parser | Core Engine | Парсит text → DSL структуру |
| DSL Schema Validator | Core Engine | Валидирует против JSON Schema |
| Prompt Contract Binding | Runtime | Маппирует schema к требованиям контракта |
| Contract Output Validator | Runtime | Валидирует AI output соответствует контракту |
| Error Reporting | Core (output) + Runtime (decision) | Core генерирует отчёт; Runtime решает retry стратегию |

---

### 7.3 Консолидировать Sandbox Policy

**Файл:** `docs/SpecRails_Security_Model_and_Sandbox_Policy.md`, раздел 3

**Заменить обе схемы на:**

```yaml
SANDBOX_POLICY_CANONICAL:
  version: 1.0
  execution:
    cpu_limit_ms: 1000
    memory_limit_mb: 128
    timeout_ms: 5000
  api_whitelist:
    - PromptAPI        # AI-related
    - ValidatorAPI     # Validation
    - ContextAPI       # Read-only Constitution + Domain
  api_blacklist:
    - fs, net, child_process, os, http
  io_access: false
  network_access: false
  telemetry_enabled: true
```

**В Runtime_Manifest:**
```yaml
# Ссылка на каноническую политику
sandbox_policy_ref: "docs/SpecRails_Security_Model_and_Sandbox_Policy.md#SANDBOX_POLICY_CANONICAL"
```

---

### 7.4 Объединить Preview + Error Recovery

**Файл:** `docs/SpecRails_Preview_Principle.md`, раздел "Позиция в Validation Loop"

**Заменить на:**

```markdown
## Объединённые фазы Validation Loop

### Machine Phase (Error Recovery)
- AI генерирует draft → Core валидирует → AI auto-корректирует (до 3 раз)

### Human Phase (Preview)
- Core-validated DSL → Preview Renderer показывает human-readable форму
- Аналитик даёт feedback через Preview UI
- Feedback возвращается AI как новый prompt input

### Resolution Phase
- Результат кешируется после human approval или timeout (30 мин)
```

---

### 7.5 Добавить Context Resolution Policy

**Файл:** `docs/SpecRails_Context_Orchestration_and_Layering_Principle.md`

**Новый раздел:**

```markdown
## Политика разрешения конфликтов

Когда значения слоёв конфликтуют, приоритет:

1. **System (Constitution)** — Никогда не переопределяется
2. **Contract Requirement** — Binding из Prompt Contract schema
3. **Project Layer** — Может переопределять domain defaults, но не contract bindings
4. **Runtime State** — Session-scoped, immutable после AI invocation
5. **User Preferences** — Самый низкий приоритет
6. **Ephemeral** — Самый высокий для текущей команды, expires after use

**Пример:**
- User предпочитает "verbose"
- Constitution требует "concise"
- Результат: **Constitution выигрывает**, user feedback логируется для Phase 2
```

---

## 8. Итоговый вердикт

Архитектура SpecRails демонстрирует **сильное философское мышление** с чётким разделением Core (детерминированный DSL engine), AI Layer (стохастическая генерация) и Governance (применение политик). Философское обязательство к "Text → DSL → Validation → Preview → CI/CD" звучит и отличает систему от generic AI workspaces.

Однако **операционная специфичность недостаточна**. Терминологическая несогласованность (три определения "Validator"), отсутствующие канонические документы (Validation Loop), дублирование политик (Sandbox), неясные границы ответственности (Context Orchestration) создают трение для имплементации. Это **не концептуальные недостатки, а пробелы выполнения** — исправляемые через дисциплинированную консолидацию документации и явное назначение ownership.

**MVP достижим за 8–12 недель**, если команда:
1. Создаёт/консолидирует 5 отсутствующих семантических якорей (Validation Loop, Sandbox Policy, Context Resolution, Core Ownership, Feedback Loop Unification)
2. Откладывает Observability, User Preferences, advanced SDK на Фазу 2
3. Реализует один, тестируемый Validation Loop с ясными критериями завершения

**Post-MVP:** адресовать риски связности (Context Orchestration → Runtime), формализовать валидацию dependency graph контрактов, построить observability-to-governance feedback для drift auto-response.

---

**Ревью завершено:** 2025-11-08  
**Приблизительные усилия на исправление:** 40–60 person-hours (документация + лёгкий рефакторинг)
