version: 2.0
status: draft
reviewed_by: AI Agent
last_updated: 2025-11-09
 
# 🗺️ Documentation Map — обзор и навигация

Карта принципиальных документов SpecRails (слой концепций и ролей). Обновлено с учётом переработанных: Parser, Orchestrator, Prompt Registry & Runtime Manifest, Validation Loop, CI/CD Quick Start.

---

## 📚 Структура

```
SpecRails Documentation v2.0
│
├─── 📖 Terminology_Glossary ←─────────┐
│    (определения всех терминов)      │
│                                      │
├─── ⚙️ CORE LAYER                     │
│    │                                 │
│    ├─── Core_Principle ──────────────┤ (границы детерминированного слоя)
│    ├─── Preview_Principle ───────────┤ (визуализация DSL)
│    └─── Parser_Architecture ─────────┤ (принципы парсера)
│                                      │
├─── 🔄 RUNTIME / ENV LAYER            │
│    │                                 │
│    ├─── Orchestrator_and_Environment ┤ (координация компонентов)
│    ├─── Validation_Loop_Principle ───┤ (двухконтурная проверка)
│    ├─── Error_and_Feedback_Cycle ────┤ (механика обратной связи)
│    └─── Prompt_Registry_and_Runtime_ │
│         Manifest ────────────────────┤ (управление промптами/модулями)
│                                      │
├─── 🛡️ GOVERNANCE LAYER               │
│    │                                 │
│    └─── Governance_Policy_Matrix ────┤
│         (политики и безопасность)   │
│                                      │
├─── 🔄 CI/CD & AUTOMATION             │
│    └─── CICD_Quick_Start ────────────┤ (интеграция в pipeline)
│                                      │
└─── 📊 OBSERVABILITY LAYER            │
     │                                 │
     └─── Observability_Framework ─────┘
          (метрики и мониторинг)
```

---

## 🔗 Основные связи

### 🎯 Начните здесь

**Для новичков:**
```
1. Terminology_Glossary
   ↓
2. Core_Principle
   ↓
3. Validation_Loop_Principle
```

**Для разработчиков:**
```
1. Core_Principle
   ↓
2. Parser_Architecture / Orchestrator_and_Environment
   ↓
3. Prompt_Registry_and_Runtime_Manifest
   ↓
4. CICD_Quick_Start
```

**Для архитекторов:**
```
1. Validation_Loop_Principle
   ↓
2. Observability_Framework
   ↓
3. Governance_Policy_Matrix
```

---

## 📋 Детальная карта связей

### Terminology_Glossary

**Зависимости:** Нет (независимый справочник)

**Используется в:**
- ✅ Всех документах для единой терминологии

**Ключевые термины:**
- DSL, Validator, Contract, Feedback
- Context, Drift, Sandbox, Manifest

---

### Core_Principle

**Зависимости:**
- Terminology_Glossary (определения)

**Связан с:**
– Validation_Loop_Principle (роль детерминированной проверки)
– Preview_Principle (визуализация вне ядра)
– Parser_Architecture (граница обращения к AI)
– Prompt_Registry_and_Runtime_Manifest (потребление контрактов)

**Ключевые концепции:**
- Что входит в ядро
- Что НЕ входит в ядро
- Принципы изоляции и воспроизводимости

---

### Preview_Principle

**Зависимости:**
- Terminology_Glossary
- Core_Principle (контекст ядра)

**Связан с:**
– Validation_Loop_Principle (человеческая проверка)
– Error_and_Feedback_Cycle (источник смыслового feedback)
– Parser_Architecture (формат получаемого DSL)

**Ключевые концепции:**
- Preview как инструмент валидации
- Интерактивная корректировка
- Проверка UX

---

### Validation_Loop_Principle

**Зависимости:**
- Terminology_Glossary
- Core_Principle (роль ядра)

**Связан с:**
– Parser_Architecture (источник DSL для проверки)
– Orchestrator_and_Environment (координация цикла)
– Preview_Principle (смысловой контур)
– Error_and_Feedback_Cycle (механизм корректировок)
– Observability_Framework (метрики качества)

**Ключевые концепции:**
- Двухконтурная валидация
- Машинная проверка (Validator)
- Человеческая проверка (Analyst)
- Итеративный цикл

---

### Error_and_Feedback_Cycle

**Зависимости:**
- Terminology_Glossary
- Validation_Loop_Principle (контекст цикла)

**Связан с:**
– Validation_Loop_Principle (источник ошибок)
– Prompt_Registry_and_Runtime_Manifest (адаптация промптов)
– Observability_Framework (лог ошибок)

**Ключевые концепции:**
- Типы ошибок
- Автоматическое исправление
- Обучение системы
- Feedback Registry

---

### Prompt_Registry_and_Runtime_Manifest

**Зависимости:**
- Terminology_Glossary
- Core_Principle (архитектура ядра)

**Связан с:**
– Parser_Architecture (правила извлечения)
– Orchestrator_and_Environment (динамическое обращение к контрактам)
– Validation_Loop_Principle (качественный вход в цикл)
– Governance_Policy_Matrix (политики версий / approvals)
– Observability_Framework (телеметрия загрузок)
– CICD_Quick_Start (валидируемые артефакты)
### Parser_Architecture
**Зависимости:** Terminology_Glossary, Prompt_Registry.
**Связан с:** Orchestrator_and_Environment (точка использования AI), Validation_Loop_Principle (источник DSL), CICD_Quick_Start (консистентность контрактов).
**Ключевые концепции:** Единственная точка общения с AI, автоопределение контрактов, композиция DSL.

### Orchestrator_and_Environment
**Зависимости:** Parser_Architecture, Prompt_Registry_and_Runtime_Manifest.
**Связан с:** Validation_Loop_Principle (триггер процесса), CICD_Quick_Start (инициируемые проверки), Observability_Framework (источники событий).
**Ключевые концепции:** Координация, внедрение зависимостей, разделение детерминированных и недетерминированных шагов.

### CICD_Quick_Start
**Зависимости:** Validation_Loop_Principle, Governance_Policy_Matrix.
**Связан с:** Prompt_Registry_and_Runtime_Manifest (версии), Observability_Framework (дрейф/метрики), Core_Principle (границы автоматизации).
**Ключевые концепции:** Валидация, drift контроль, отчётность, блокировка.

**Ключевые концепции:**
- Prompt Registry (версии промптов)
- Runtime Manifest (загрузка модулей)
- Dependency Resolution
- Integrity Verification

---

### Governance_Policy_Matrix

**Зависимости:**
- Terminology_Glossary
- Prompt_Registry (контроль контрактов)

**Связан с:**
- → Observability_Framework (мониторинг политик)
- → Error_and_Feedback_Cycle (Drift Policy)

**Ключевые концепции:**
- Sandbox Policy
- Contract Lock
- Drift Control
- GDPR Compliance
- AI Ethics

---

### Observability_Framework

**Зависимости:**
- Terminology_Glossary
- Validation_Loop_Principle (метрики валидации)

**Связан с:**
- → Error_and_Feedback_Cycle (метрики обучения)
- → Governance_Policy_Matrix (контроль drift)
- → Prompt_Registry (телеметрия модулей)

**Ключевые концепции:**
- Metrics, Logs, Traces
- Drift Control
- Audit Trail
- Dashboard

---

## 🎓 Путеводители по задачам

### Задача: Понять как работает SpecRails

```
1. Terminology_Glossary → узнайте термины
2. Core_Principle → поймите архитектуру ядра
3. Validation_Loop_Principle → как проверяется качество
4. Preview_Principle → как работает визуализация
```

---

### Задача: Создать новый модуль

```
1. Core_Principle → архитектурные границы
2. Prompt_Registry_and_Runtime_Manifest → регистрация модуля
3. Governance_Policy_Matrix → политики безопасности
4. Observability_Framework → добавление телеметрии
```

---

### Задача: Настроить CI/CD валидацию

```
1. Validation_Loop_Principle → что проверяем
2. Governance_Policy_Matrix → правила и пороги
3. Observability_Framework → метрики и алерты
```

---

### Задача: Отладить проблему с AI

```
1. Error_and_Feedback_Cycle → типы ошибок
2. Validation_Loop_Principle → цикл исправления
3. Observability_Framework → drift анализ
4. Prompt_Registry → версии контрактов
```

---

## 📊 Граф (упрощённо)

```
            Terminology_Glossary
                            │
        ┌──────────────┬──────────────┐
        │              │              │
        ▼              ▼              ▼
     Core_Principle   Parser_Architecture  Prompt_Registry
        │              │              │
        │              └──────┐       │
        ▼                     ▼       │
     Validation_Loop_Principle  Orchestrator_and_Environment
        │              │       │
        │              │       ▼
        │              │   CICD_Quick_Start
        │              │       │
        ├─────► Error_and_Feedback_Cycle │
        │              │       │
        ▼              ▼       ▼
     Observability_Framework  Governance_Policy_Matrix
```

---

## 🔍 Поиск по темам

### AI и промпты
- Validation_Loop_Principle → роль AI
- Error_and_Feedback_Cycle → обучение AI
- Prompt_Registry → управление контрактами
- Observability_Framework → drift control

---

### Безопасность
- Governance_Policy_Matrix → все политики
- Prompt_Registry → Sandbox Policy
- Observability_Framework → audit trail

---

### Валидация и проверка
- Validation_Loop_Principle → основной цикл
- Core_Principle → роль Validator
- Preview_Principle → визуальная проверка
- Error_and_Feedback_Cycle → обработка ошибок

---

### Метрики и мониторинг
- Observability_Framework → полный обзор
- Error_and_Feedback_Cycle → метрики обучения
- Governance_Policy_Matrix → контроль политик
- Validation_Loop_Principle → метрики валидации

---

## 📝 Краткие описания (обновлённые)

| Документ | Одной строкой |
|----------|---------------|
| **Terminology_Glossary** | Словарь всех терминов SpecRails |
| **Core_Principle** | Что такое ядро и что в него входит |
| **Preview_Principle** | Как визуализация помогает проверке |
| **Validation_Loop_Principle** | Двухконтурная валидация AI + человек |
| **Error_and_Feedback_Cycle** | Как ошибки превращаются в улучшения |
| **Prompt_Registry_and_Runtime_Manifest** | Управление промптами, версиями и активными модулями |
| **Parser_Architecture** | Принципы извлечения и композиции DSL через AI |
| **Orchestrator_and_Environment** | Координация недетерминированного окружения |
| **CICD_Quick_Start** | Включение проверки и drift контроля в pipeline |
| **Governance_Policy_Matrix** | Все правила безопасности и контроля |
| **Observability_Framework** | Метрики, логи и мониторинг системы |

---

## 🎯 Рекомендации по чтению

### Минимальный набор (быстрый старт)

1. **Terminology_Glossary** (10 мин)
2. **Core_Principle** (15 мин)
3. **Validation_Loop_Principle** (20 мин)

**Итого:** ~45 минут для понимания основ

---

### Полный набор (глубокое изучение)

1. Terminology_Glossary
2. Core_Principle
3. Preview_Principle
4. Validation_Loop_Principle
5. Error_and_Feedback_Cycle
6. Prompt_Registry_and_Runtime_Manifest
7. Governance_Policy_Matrix
8. Observability_Framework

**Итого:** ~3-4 часа для полного понимания системы

---

## 🔄 Последовательность обновлений (dependency impact)

При изменении одного документа проверьте связанные:

**При обновлении Terminology_Glossary:**
- ✅ Проверьте все остальные документы

**При обновлении Core_Principle:**
- ✅ Validation_Loop_Principle
- ✅ Preview_Principle
- ✅ Prompt_Registry

**При обновлении Validation_Loop:**
– Error_and_Feedback_Cycle
– Observability_Framework
– CICD_Quick_Start (изменение критериев проверки)

**При обновлении Governance_Policy:**
– Prompt_Registry_and_Runtime_Manifest
– Observability_Framework
– CICD_Quick_Start (политики блокировки)

**При обновлении Parser_Architecture:**
– Orchestrator_and_Environment
– Validation_Loop_Principle
– CICD_Quick_Start (валидируемые контракты)

**При обновлении Orchestrator_and_Environment:**
– CICD_Quick_Start
– Observability_Framework
– Validation_Loop_Principle

---

## 📚 Связанные ресурсы

- **README.md** — общий индекс и навигация
- **META_REVIEW** — план рефакторинга
- **/docs/** — оригинальные документы (архив)

---

Эта карта поможет быстро найти нужную информацию и понять, как документы связаны друг с другом.
