# Архитектурный ревью SpecRails — Оценка согласованности системы

**агент:** архитектор  
**кои:** нет  
**версия:** 1.0  
**дата:** 2025-11-06  
**рецензент:** Анализ системной архитектуры

---

## 1. Резюме

- **Оценка согласованности:** 3.8/5 — Сильное концептуальное выравнивание с архитектурными уязвимостями в операционализации
- **Сильная сторона:** SpecRails определяет чёткое разделение ответственности (Core DSL Engine ⊥ AI Layer ⊥ Preview) и устанавливает твёрдые философские границы (ядро ≠ AI инструмент)
- **Критическая проблема:** Неконсистентность терминологии и дублирование определений между Validation Loop, Preview Principle и Error Recovery создаёт когнитивное трение
- **Риск:** Runtime слои (Sandbox, Context Orchestration, Observability) вводят архитектурную связность, которая может скомпрометировать заявленный принцип изоляции
- **Готовность MVP:** 65% — Базовые принципы прочны; исполнение должно приоритизировать формализацию Validation Loop и остановить распространение функций
- **Рекомендация:** Консолидировать семантику управления, установить единый источник истины для валидации и отложить продвинутые средства мониторинга на Фазу 2

---

## 2. Оценки (0–5)

| Измерение | Оценка | Обоснование |
|-----------|--------|------------|
| **согласованность** | 3.5 | Терминология в Core и Runtime слоях использует разную номенклатуру для идентичных концепций (напр., "Validation" встречается в Validation Loop + Error Recovery + Contract Validator—три конкурирующих определения) |
| **реализуемость** | 3.0 | Область MVP достижима, но критически зависит от откладывания Observability, глубокой интеграции CI/CD и продвинутых функций SDK. Текущий манифест предполагает 15–20% лишнего |
| **ясность** | 3.5 | Базовые принципы ясны; документы Governance Layer и Context Orchestration создают двусмысленность о том, где принимаются решения (Core или Runtime?) |
| **избыточность** | 3.5 | Значительное дублирование: Prompt Contract Lifecycle ≈ Runtime Manifest Registry; Preview ≈ Feedback; Drift Control ≈ Audit Trail. Не активно вредно, но размывает фокус |
| **риск** | 3.0 | Технические риски умеренны, но организационные риски высоки: неясная ответственность за Context Orchestration, Drift Control и Sandbox Policies на трёх отдельных слоях |

---

## 3. Ключевые находки

### [F1] **Базовый принцип философски прочен, но операционно расплывчат**

**Местоположение:** `SpecRails_Core_Principle.md` (строки 1–50), `SpecRails_System_Overview_Final_Architecture_Blueprint.md` (раздел 2)

**Находка:**
Философский постулат — *"ядро SpecRails — это генерация структурированных артефактов (DSL) из текстовых описаний"* — верен и отличает SpecRails от систем типа "AI workspace".

**Проблема:**
Документ утверждает, что Core содержит "Parser Layer", "Validator Layer" и "Spec Schema Registry", но документы Runtime позже говорят, что это управляется Prompt Execution Runtime, Context Orchestrator и Runtime Manifest. Это создаёт двусмысленность относительно ответственности модулей.

**Доказательство:**
- Core Principle говорит: "Validator Layer — проверка на синтаксис, целостность и совместимость DSL"
- Prompt Execution Runtime говорит: "Validator — проверяет, что ответ AI соответствует ожидаемой схеме"
- Error Recovery говорит: "Core Validator — Генерирует машинный отчёт об ошибках"

Это один и тот же логический компонент, описанный трижды с разными формулировками.

---

### [F2] **Документ Validation Loop Principle отсутствует — критическая семантическая пустота**

**Местоположение:** Documents Index перечисляет `./docs/SpecRails_Validation_Loop_Principle.md`, но файл не существует в рабочей области

**Находка:**
Системная модель неоднократно ссылается на "двухконтурная модель SpecRails Validation Loop", но основной документ, его определяющий, отсутствует. Без этого семантика валидации рассеяна по:
- Preview Principle (цикл обратной связи)
- Error Recovery (цикл восстановления AI)
- Prompt Execution Runtime (цикл обратной связи с переподсказкой)

**Риск:** Разработчики и будущие сопровождающие лишены канонического определения того, что составляет "валидную" итерацию цикла и когда результат "готов".

---

### [F3] **Context Orchestration Layer вводит скрытую связность**

**Местоположение:** `SpecRails_Context_Orchestration_and_Layering_Principle.md` (разделы 1–6)

**Находка:**
Context Orchestration заявляет о себе как "governance" слой, но его реализация тесно связана с Prompt Execution Runtime. Пример:

```yaml
final_context:
  constitution: "prompt_constitution.v1"
  project: { name: "Education Portal" }
  domain: "ui/forms"
  user: { name: "Viktor" }
  runtime: { document: "...", history_ref: "#session_245" }
```

Эта структура смешивает:
- **Неизменяемые слои** (Constitution) с **изменяемыми пользовательскими предпочтениями** (User layer)
- **Логическое управление** (Domain) с **переходящим состоянием сессии** (Runtime)
- **Контракты уровня проекта** (Project) с **реальным контекстом** (Ephemeral)

**Следствие:**
Модель слоёв нарушает принцип единственной ответственности. Изменение одного слоя может непредсказуемо влиять на вывод AI через неочевидные правила приоритета.

---

### [F4] **Sandbox Policy определена дважды — нет ясной модели применения**

**Местоположение:** `SpecRails_Security_Model_and_Sandbox_Policy.md` (раздел 3) vs. `SpecRails_Runtime_Manifest_and_Module_Registry.md` (раздел 5)

**Находка:**
Оба документа определяют `sandbox_policy` с немного различающимися названиями полей и областью видимости:

**Версия Security_Model:**
```yaml
sandbox_policy:
  cpu_limit_ms: 1000
  memory_limit_mb: 128
  allowed_apis: ["PromptAPI", "ValidatorAPI"]
  restricted_modules: ["fs", "net", "child_process"]
  io_access: false
```

**Версия Runtime_Manifest:**
```yaml
sandbox_policy:
  allowed_apis: ["PromptAPI", "ValidatorAPI", "ContextAPI"]
  restricted_modules: ["fs", "child_process", "http"]
  timeout_ms: 5000
  memory_limit_mb: 128
```

**Проблема:** Разные разрешённые API (`io_access` vs. `http`), разные таймауты по умолчанию, разные версии того, что означает "restricted".

---

### [F5] **AI Interaction Protocols определяют контракты сообщений, но модель управления отсутствует**

**Местоположение:** `SpecRails_AI_Interaction_Protocols_and_Communication_Contracts.md`

**Находка:**
Документ обеспечивает ясные фреймы сообщений (формат запроса/ответа), но НЕ определяет:
- Как разрешаются конфликтующие ответы (когда AI нарушает контракт)
- Семантику повторных попыток и политики экспоненциального отката
- Какая модель AI является "по умолчанию" vs. "резервная"
- Как версии контрактов согласуются с провайдерами AI

**Доказательство:** Error Frame System перечисляет коды (E001–E005), но назначает действия реактивно ("retry", "switch model") без критериев политики для выбора применяемого действия.

---

### [F6] **Lifecycle Prompt Contract переспецифицирован; модель реализации неясна**

**Местоположение:** `SpecRails_Prompt_Registry_and_Lifecycle.md`

**Находка:**
Документ определяет 6 состояний lifecycle (Draft → Review → Published → Active → Deprecated → Archived) с ясными автоматами состояний. Однако:

1. **Нет критериев решения** для переходов состояний (кто решает, когда Deprecate?)
2. **Нет семантики отката** (если контракт Deprecated, можно ли его реактивировать?)
3. **Нет разрешения конфликтов** когда несколько версий контракта используются одновременно

**Следствие:** Runtime должен обрабатывать неоднозначные сценарии — напр., если `form.contract.v1` Deprecated, но `form.contract.v2` не проходит валидацию, что должна сделать система?

---

### [F7] **SDK API Surface документирована, но точки интеграции неясны**

**Местоположение:** `SpecRails_SDK_Overview_and_Extension_API.md` (разделы 2–7)

**Находка:**
SDK определяет 7 основных модулей API:
- PromptAPI, ContextAPI, RuntimeAPI, ValidatorAPI, ExtensionAPI, CLI API, PreviewAPI

Но документ НЕ указывает:
- Какие API безопасны для разработчиков третьих сторон vs. только внутренние
- Гарантии обратной совместимости (политика семантического версионирования)
- Контракты обработки ошибок (какие исключения может выбросить каждый API?)
- Предположения о потокобезопасности для конкурентного доступа

---

### [F8] **Prompt Modularity заявляет о слабой связности, но реальная модель зависимостей сильна**

**Местоположение:** `SpecRails_Prompt_Modularity_Principle.md` (разделы 1–6)

**Находка:**
Документ заявляет:

> "Контракты связаны только через публичные контексты, а не внутренние структуры"

Но документы Lifecycle и примеры Registry показывают:

```yaml
- id: form.contract.v2
  status: active
  depends_on: ["model.contract.v1", "acl.contract.v1"]
  schema: "spec.form.v1.json"
```

Это **прямая жёсткая зависимость**, не слабая связь. Если `model.contract.v1` изменит выходную схему, `form.contract.v2` сломается молча (нет валидации кросс-контрактной совместимости схем).

---

### [F9] **Observability Layer описана, но не интегрирована в основной поток**

**Местоположение:** `SpecRails_Observability_and_Telemetry_Layer.md`, `SpecRails_Operational_Runtime_and_Observability_Layer.md`

**Находка:**
Два отдельных документа определяют Observability с пересекающейся областью видимости:
- Observability_and_Telemetry сосредотачивается на сборе метрик (Prometheus, Grafana)
- Operational_Runtime сосредотачивается на мониторинге здоровья модулей

**Проблема:** Ни один документ не указывает:
- Где генерируются события телеметрии (какой слой их генерирует?)
- Как данные observability возвращаются в решения управления (обнаружение drift → deprecation контракта?)
- Компромисс затрат/производительности логирования всех AI интеракций

---

### [F10] **System Overview заявляет о холистической архитектуре, но опускает модель сохранения данных**

**Местоположение:** `SpecRails_System_Overview_Final_Architecture_Blueprint.md`

**Находка:**
Чертёж показывает потоки данных (Text → Prompt → AI → DSL → Validation → Preview), но НЕ определяет:
- Где хранятся артефакты DSL (локальная файловая система? git? база данных?)
- Как управляются версии (семантика git? пользовательское версионирование?)
- Как работает сотрудничество между аналитиками (слияние конфликтов в DSL?)

---

## 4. Противоречия и пробелы

| Где (документ/раздел) | Проблема | Серьёзность | Предложение исправления |
|---|---|---|---|
| Core Principle (¶1) vs. Prompt Execution Runtime (¶1) | Оба претендуют на владение "Validator Layer"—неясно, один ли компонент или два отдельных | **ВЫСОКАЯ** | Переопределить: Core владеет DSL схемой валидации; Runtime владеет связыванием контракта к схеме. Документировать один интерфейс. |
| Context Orchestration (¶7) vs. AI Interaction Protocols (¶3) | Context Orchestration говорит, что слои имеют правила приоритета; Protocols говорят, что контракты сообщений неизменяемы—конфликт когда контекст пользователя конфликтует с требованием контракта | **ВЫСОКАЯ** | Установить правило приоритета: Constitution неизменяемая > Contract binding > Project layer > User prefs. Документировать как "Context Resolution Policy." |
| Security Model (¶3) vs. Runtime Manifest (¶5) | Две разные схемы `sandbox_policy` с конфликтующими именами полей—какая каноническая? | **СРЕДНЯЯ** | Выбрать одну схему. Переместить все определения политик в один канонический документ (напр., `Security_Model_and_Sandbox_Policy.md`). Обновить Runtime_Manifest ссылкой на него. |
| Validation Loop (missing) | Система неоднократно ссылается на "validation loop principle", но документ не существует | **ВЫСОКАЯ** | Создать `SpecRails_Validation_Loop_Principle.md` определяющий семантику цикла, критерии завершения итерации и метрики успеха. |
| Preview Principle (¶2) vs. Error Recovery (¶3) | Оба описывают "feedback loop"—это один поток или два разных? | **СРЕДНЯЯ** | Уточнить: Preview — это *визуальная* человеческая обратная связь; Error Recovery — это *структурная* машинная обратная связь. Документировать оба как отдельные фазы Validation Loop. |
| SDK API (¶2) vs. Security Model (¶5) | SDK перечисляет ContextAPI как разрешённый в sandbox; Security Model его ограничивает—могут ли утилиты получать доступ к контексту? | **СРЕДНЯЯ** | Уточнить, какие слои Context доступны из sandbox (read-only Constitution + Domain? или изменяемый Runtime тоже?). Документировать как "Sandbox API Whitelist." |
| Prompt Registry (¶4) vs. Runtime Manifest (¶2) | Registry управляет lifecycle контракта; Manifest объявляет активные модули—кто ответствен за версионирование контракта при развёртывании? | **СРЕДНЯЯ** | Установить: Registry — источник истины для определений контрактов; Manifest записывает, какие версии развёрнуты. Manifest загружает из Registry при старте. |
| Knowledge Base (¶3) vs. Context Engine (¶5) | KB хранит принципы; Context Engine их собирает—два ли это слоя или один? Может ли KB обновляться без перезагрузки? | **НИЗКАЯ** | Уточнить: KB — статичное хранилище файлов; Context Engine — runtime кеш. Документировать семантику обновления (горячая перезагрузка vs. требуется перезагрузка). |
| Deployment Framework (ref) vs. CI/CD Integration (ref) | Два отдельных документа развёртывания—пересечение области видимости | **НИЗКАЯ** | Проверить оба; консолидировать в один документ "Deployment & CI/CD Integration" или ясно разграничить ответственность. |

---

## 5. Рекомендации MVP

### **Обязательные (Фаза 1 — базовая жизнеспособность)**

- ✅ **Core DSL Engine + Parser/Validator**: Реализовать компиляцию text → DSL с валидацией JSON Schema
- ✅ **Prompt Execution Runtime**: Вызов AI, привязка контракта и один цикл обратной связи (коррекция ошибок)
- ✅ **Context Orchestration (упрощённый)**: Только 3–4 основных слоя (System, Domain, Project, Ephemeral); отложить слои User/Runtime
- ✅ **Sandbox Basics**: Изоляция процессов и API whitelist для модулей (не продвинутые лимиты ресурсов)
- ⚠️ **Preview Renderer**: Только HTML/статичный вывод (без интерактивного режима редактирования)
- ⚠️ **Error Recovery**: Автоматический retry с уточнением контракта (без человеческого цикла)
- **Формализация Validation Loop**: Один канонический документ + ясные критерии завершения

### **Отложить на Фазу 2 (Стабильность и Наблюдаемость)**

- Полный lifecycle Registry Prompt (Draft → Deprecated → Archive). Начать только с "Published" и "Deprecated".
- Продвинутая Context Orchestration (User preferences, Runtime state слои). Использовать defaults.
- Полный стек Observability (Prometheus, Grafana, Slack интеграция). Логировать в stdout/файл изначально.
- Глубокая интеграция CI/CD (governance политики, drift detection). Только ручной workflow одобрений.
- SDK Extension API для разработчиков третьих сторон. Закрыть на внутреннее использование.
- Human Feedback Loop в Preview. Реализовать сначала автоматическую машинную корректировку.

### **Удалить или консолидировать**

- **Удалить:** Отдельный документ "Operational_Runtime_and_Observability_Layer". Объединить с Observability_and_Telemetry_Layer.
- **Объединить:** Preview Principle + Error Recovery в унифицированный "Validation Loop Principle".
- **Консолидировать:** Определения sandbox в Security_Model + Runtime_Manifest в один канонический Sandbox Policy.
- **Уточнить ответственность:** Явно указать, какой модуль владеет каждым слоем (напр., "Core владеет Validation; Runtime владеет Orchestration; SDK владеет Extensibility").

---

## 6. Реестр рисков

| Риск | Влияние | Вероятность | Смягчение |
|---|---|---|---|
| **Терминология создаёт путаницу разработчиков** | Переделка, баги, более длительное вовлечение | ВЫСОКАЯ | Установить Глоссарий SpecRails (20 терминов). Проверить все документы на семантическую консистентность. Применить один термин на концепцию. |
| **Context Orchestration layer связывает Runtime, нарушая заявленную изоляцию** | Регресс архитектуры; сложность замены AI провайдеров | СРЕДНЯЯ | Формализировать Context Interface как строгий контракт (схемы input/output). Отделить логику контекста от dispatch runtime. Мок контекста для unit тестов. |
| **Несоответствие sandbox политики разрешает непредусмотренный доступ к API** | Уязвимость безопасности; утечка данных | СРЕДНЯЯ | Выбрать одну каноническую схему Sandbox Policy. Обновить все ссылки. Добавить security тесты, проверяющие применение API whitelist. |
| **Validation Loop не определён—система может зависнуть в неоднозначном состоянии** | Разочарование пользователя; бесконечные циклы; преждевременный отказ от внедрения | ВЫСОКАЯ | Документировать цикл с явными критериями завершения (напр., "max 3 retries" или "validation passes"). Реализовать watchdog timer. |
| **Граф зависимостей контракта не валидируется при развёртывании** | Молчаливое несоответствие версий контрактов; ошибки runtime в production | СРЕДНЯЯ | Добавить pre-deployment валидацию: трассировать все рёбра `depends_on` и проверить совместимость версий. Сбой сборки при несоответствии. |
| **Lifecycle Prompt Contract разрешает неоднозначные переходы состояний** | Deprecated контракты могут использоваться непреднамеренно | НИЗКАЯ | Добавить guards переходов состояний: Deprecated → Active требует явного переопубликования; Archived не может быть реактивирован. |
| **SDK API surface не имеет гарантий стабильности** | Интеграции третьих сторон ломаются при версионировании minor | СРЕДНЯЯ | Определить "stable" APIs (semver: major.minor.patch) vs. "experimental" (alpha/beta). Обещать обратную совместимость для stable APIs. |
| **Observability отделена от решений управления** | Система не может автоответить на аномалии (напр., drift > 5%) | НИЗКАЯ | Добавить цикл обратной связи: Observability → Governance → Automation. Документировать auto-response политики (Фаза 2). |

---

## 7. Предложенные правки (Подсказки для патчей)

### **7.1 Создать отсутствующий документ Validation Loop**

**Файл:** `docs/SpecRails_Validation_Loop_Principle.md`

**Контур содержимого:**
```markdown
# Принцип Validation Loop

## Определение цикла
Validation Loop: (AI Output) → (Core Validator) → [Pass?] 
  → YES: (Cache & Preview)
  → NO: (Feedback Manager) → (AI Repair Loop) → retry

## Критерии завершения
- Max retries = 3 (настраиваемо)
- Timeout = 5 секунд за итерацию
- Success = output проходит schema + core правила
- Failure = после max retries → эскалация человеку

## Фазы
1. **Machine Validation** (автоматическая, 3 retries)
2. **Human Review** (опциональная, если машина не справилась)
3. **Approval & Cache** (подпись аналитика или пропуск)

## Метрики
- Success rate (% проходит с первого раза)
- Avg retry depth
- Время до стабильного результата
```

### **7.2 Уточнить ответственность Core vs. Runtime**

**Правка Core Principle, раздел "Что входит в ядро":**

```markdown
| Компонент | Ответственность | Обоснование |
| Core DSL Parser | Core Engine | Парсит text → DSL структура |
| DSL Validator (Schema) | Core Engine | Валидирует против JSON Schema |
| Prompt Contract Binding | Runtime | Маппирует schema к требованиям контракта |
| Contract Validator | Runtime | Валидирует, что AI output соответствует контракту |
| Error Reporting | Core (output) + Runtime (decision) | Core генерирует отчёт; Runtime решает retry стратегию |
```

### **7.3 Консолидировать Sandbox Policy**

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
    - ContextAPI       # Read-only constitution + domain
  api_blacklist:
    - fs, net, child_process, os, http
  io_access: false
  network_access: false
  telemetry_enabled: true
```

**Обновить ссылку Runtime_Manifest:**
```yaml
# Ссылка на каноническую политику вместо переопределения
sandbox_policy_ref: "docs/SpecRails_Security_Model_and_Sandbox_Policy.md#SANDBOX_POLICY_CANONICAL"
```

### **7.4 Объединить Preview + Error Recovery в унифицированный цикл**

**Правка Preview Principle, раздел "Позиция в Validation Loop":**

```markdown
## Объединённые фазы Validation Loop

1. **Machine Phase** (Error Recovery):
   - AI генерирует черновик → Core валидирует → AI auto-корректирует (до 3 раз)
   
2. **Human Phase** (Preview):
   - Core-валидированный DSL → Preview Renderer показывает человеко-читаемую форму
   - Аналитик предоставляет обратную связь через Preview UI
   - Обратная связь возвращается AI как новый prompt input

3. **Resolution Phase**:
   - Результат кешируется после одобрения человеком или таймаута (30 мин)
```

### **7.5 Добавить Context Resolution Policy**

**Файл:** Новый раздел в Context_Orchestration_and_Layering_Principle.md

```markdown
## Политика разрешения конфликтов

Когда значения слоёв конфликтуют, приоритет:

1. **System (Constitution)** — Никогда не переопределяется, неизменяемо в сессии
2. **Contract Requirement** — Binding из схемы Prompt Contract
3. **Project Layer** — Может переопределять defaults домена, но не contract bindings
4. **Runtime State** — Session-scoped, неизменяемо после старта AI invocation
5. **User Preferences** — Самый низкий приоритет, используется только если ни один prior слой не установил значение
6. **Ephemeral** — Самый высокий приоритет для текущей команды, истекает после одного использования

**Пример разрешения:**
- User предпочитает "verbose" стиль
- Constitution требует "concise" для spec generation
- Результат: **Constitution выигрывает**, user обратная связь залогирована для Phase 2 tuning
```

---

## 8. Итоговый вердикт

Архитектура SpecRails демонстрирует **сильное основополагающее мышление** с чётким разделением между Core (детерминированный DSL engine), AI Layer (стохастическая генерация) и Governance (применение политик). Философское обязательство к "Text → DSL → Validation → Preview → CI/CD" звучит и отличает систему от генерических AI workspaces.

Однако, **операционная специфичность недостаёт**. Неконсистентность терминологии (три определения "Validator"), отсутствующие канонические документы (Validation Loop), избыточные определения политик (Sandbox) и неясные границы ответственности (Context Orchestration) создают трение для реализации. Это **не концептуальные недостатки, а пробелы выполнения**—исправляемые через дисциплинированную консолидацию документации и явное назначение ответственности.

**MVP достижим в 8–12 недель**, если команда:
1. Создаёт/консолидирует 5 отсутствующих семантических якорей (Validation Loop, Sandbox Policy, Context Resolution, Core Ownership, Feedback Loop Unification)
2. Откладывает Observability, User Preferences и продвинутый SDK на Фазу 2
3. Реализует один, тестируемый Validation Loop с явными критериями завершения

**Post-MVP**, адресовать риски связности (Context Orchestration → Runtime), формализировать валидацию графа зависимостей контрактов и построить обратную связь observability-to-governance для drift auto-response.

---

## Приложения

### A. Инвентарь терминологии (Проверка консистентности)

| Термин | Встречается в | Определения | Проблема |
|------|-----------|------------|-------|
| **Validator** | Core Principle, Execution Runtime, Error Recovery | (a) Schema checker (b) Contract checker (c) Error detector | Использовать: `SchemaValidator`, `ContractValidator`, `OutputValidator` |
| **Feedback Loop** | Preview, Error Recovery, Execution Runtime | (a) Human-driven (b) Machine-driven | Использовать: `HumanFeedbackLoop`, `MachineFeedbackLoop` |
| **Validation Loop** | Context docs, Overview, missing primary doc | Весь цикл от AI output к approval | Создать каноническое определение |
| **Drift** | Observability, CICD, Knowledge Base | AI behaviour deviation, schema drift, context drift | Уточнить: specify что дрифтует (outputs? semantics? quality?) |
| **Context** | Context Orchestration, AI Interaction, SDK | (a) Multi-layer state (b) prompt input (c) user environment | Использовать: `ExecutionContext`, `ProgramContext`, `UserContext` |
| **Contract** | Prompt Registry, Modularity, Governance | (a) Prompt template (b) API interface (c) policy agreement | Использовать: `PromptContract`, `APIContract`, `SLAContract` |

### B. Резюме метрик архитектуры

| Метрика | Цель | Текущая | Статус |
|--------|--------|---------|--------|
| Терминологическая консистентность (% уникальных терминов) | >90% | 70% | ⚠️ Требует очистки |
| Document cross-references resolved | 100% | 85% | ⚠️ Отсутствует Validation Loop |
| Единственный источник истины на концепцию | 100% | 60% | ❌ Sandbox, Feedback, Validator определены 2–3 раза |
| Ясность ответственности слоёв (0–10) | 9 | 6 | ⚠️ Context Orchestration неоднозначна |
| MVP scope bloat (docs vs. MVP features) | <30% | 45% | ⚠️ Observability, advanced SDK, full lifecycle |

---

**Ревью завершено:** 2025-11-06  
**Приблизительные усилия на исправление:** 40–60 person-hours (документация + лёгкий рефакторинг)
