version: 2.0
status: draft
reviewed_by: AI Agent
last_updated: 2025-11-09
 
# 🗺️ Documentation Map — обзор и навигация

Этот документ служит картой всех основных документов SpecRails, показывая их взаимосвязи, зависимости и ключевые концепции. Он поможет быстро ориентироваться в документации и понять, какие документы читать для решения конкретных задач.

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

| Документ                                                                            | Одной строкой                                       |
|-------------------------------------------------------------------------------------|-----------------------------------------------------|
| **[Terminology_Glossary](Terminology_Glossary.md)**                                 | Словарь всех терминов SpecRails                     |
| **[Core_Principle](Core_Principle.md)**                                             | Что такое ядро и что в него входит                  |
| **[Preview_Principle](Preview_Principle.md)**                                       | Как визуализация помогает проверке                  |
| **[Validation_Loop_Principle](Validation_Loop_Principle.md)**                       | Двухконтурная валидация AI + человек                |
| **[Error_and_Feedback_Cycle](Error_and_Feedback_Cycle.md)**                         | Как ошибки превращаются в улучшения                 |
| **[Prompt_Registry_and_Runtime_Manifest](Prompt_Registry_and_Runtime_Manifest.md)** | Управление промптами, версиями и активными модулями |
| **[Parser_Architecture](Parser_Architecture.md)**                                   | Принципы извлечения и композиции DSL через AI       |
| **[Orchestrator_and_Environment](Orchestrator_and_Environment.md)**                 | Координация недетерминированного окружения          |
| **[CICD_Quick_Start](CICD_Quick_Start.md)**                                         | Включение проверки и drift контроля в pipeline      |
| **[Governance_Policy_Matrix](Governance_Policy_Matrix.md)**                         | Все правила безопасности и контроля                 |
| **[Observability_Framework](Observability_Framework.md)**                           | Метрики, логи и мониторинг системы                  |
