# 📚 SpecRails Documents Index
_Все документы расположены в папке `./docs/` относительно корня проекта._

---

## 1️⃣ Core Layer — ядро системы (приоритет: высокий)
- **./docs/SpecRails_Core_Principle.md** — философия и архитектурная база SpecRails; ядро порождает DSL из текста, AI — инструмент. (core)
- **./docs/SpecRails_Prompt_Modularity_Principle.md** — принципы модульности промтов и контрактов, управление зависимостями. (core)
- **./docs/SpecRails_Prompt_Registry_and_Lifecycle.md** — реестр и жизненный цикл промтов, контракты их регистрации и версионирования. (core)
- **./docs/SpecRails_Prompt_Execution_Runtime.md** — структура выполнения AI-интеракций и обработка промтов. (core)

---

## 2️⃣ AI Governance & Context Layer — когнитивное управление и контекст
- **./docs/SpecRails_AI_Interaction_Protocols_and_Communication_Contracts.md** — формализация протоколов общения между AI и пользователем. (governance)
- **./docs/SpecRails_Context_Orchestration_and_Layering_Principle.md** — управление слоями контекста: пользователь, проект, задача, история. (context)
- **./docs/SpecRails_Knowledge_Base_and_Prompt_Constitution.md** — устройство знаниевой базы и конституции промтов, когнитивная согласованность. (context)
- **./docs/SpecRails_AI_Safety_Compliance_and_Ethics_Layer.md** — политика безопасности и этики взаимодействия с AI. (governance)

---

## 3️⃣ Runtime Layer — исполняющая среда и безопасность
- **./docs/SpecRails_Runtime_Manifest_and_Module_Registry.md** — декларация и контроль активных модулей в runtime, управление зависимостями. (runtime)
- **./docs/SpecRails_Security_Model_and_Sandbox_Policy.md** — архитектура безопасности, sandbox, ограничение доступа и контроль целостности. (runtime)
- **./docs/SpecRails_Error_Recovery_and_Feedback_Mechanism.md** — механизмы восстановления после ошибок и обратной связи. (runtime)
- **./docs/SpecRails_Validation_Loop_Principle.md** — итеративный цикл валидации DSL и спецификаций. (runtime)
- **./docs/SpecRails_Preview_Principle.md** — визуализация спецификаций (preview) для аналитика; проверка через представление. (runtime)

---

## 4️⃣ SDK & Development Layer — разработка и расширяемость
- **./docs/SpecRails_SDK_Overview_and_Extension_API.md** — описание SDK, API, и хуков для подключения расширений. (sdk)
- **./docs/SpecRails_Developer_Guide_Building_AI_Utilities.md** — руководство по созданию AI-утилит на основе SDK. (sdk)

---

## 5️⃣ Configuration & Deployment Layer — конфигурация и окружения
- **./docs/SpecRails_Configuration_Policies_and_Environment_Profiles.md** — профили окружений (local, team, enterprise), конфигурация и политики. (deployment)
- **./docs/SpecRails_Deployment_and_Integration_Framework.md** — схема развёртывания и интеграции с IDE, web и CI-средами. (deployment)
- **./docs/SpecRails_CICD_Integration_and_Automated_Governance.md** — интеграция SpecRails с CI/CD и автоматический контроль версий и политик. (deployment)

---

## 6️⃣ Observability & Governance Layer — наблюдаемость и контроль
- **./docs/SpecRails_Observability_and_Telemetry_Layer.md** — сбор метрик, телеметрия, аудит и контроль стабильности AI. (observability)
- **./docs/SpecRails_Operational_Runtime_and_Observability_Layer.md** — мониторинг исполнения модулей и runtime-здоровья. (observability)
- **./docs/SpecRails_Human_Feedback_and_Learning_Loop.md** — роль пользователя в обратной связи и обучении AI. (observability)

---

## 7️⃣ System Overview — архитектурный обзор
- **./docs/SpecRails_System_Overview_Final_Architecture_Blueprint.md** — итоговая архитектура SpecRails; взаимосвязь всех слоёв и компонентов. (overview)

---

## 📊 Review Priorities

| Layer                      | Documents | Priority    | Agent Focus                          |
|:---------------------------|:----------|:------------|:-------------------------------------|
| Core                       | 4         | 🔴 High     | Architect (0.5), MVP (0.3), UX (0.2) |
| AI Governance / Context    | 4         | 🟠 Medium   | Architect (0.4), UX (0.4), MVP (0.2) |
| Runtime                    | 5         | 🔴 High     | Architect (0.4), MVP (0.5), UX (0.1) |
| SDK / Development          | 2         | 🟡 Medium   | MVP (0.6), Architect (0.3), UX (0.1) |
| Configuration / Deployment | 3         | 🟢 Low      | Architect (0.4), MVP (0.4), UX (0.2) |
| Observability / Governance | 3         | 🟢 Low      | Architect (0.4), MVP (0.3), UX (0.3) |
| Overview                   | 1         | 🔵 Systemic | Architect (0.6), MVP (0.3), UX (0.1) |

---

### 🔖 Примечания
- Приоритеты задают **вес при ревью** и **порядок изучения документов**:
    - Сначала **Core** и **Runtime** → базовая логика SpecRails.
    - Затем **Context** и **SDK** → расширяемость и когнитивный контекст.
    - В конце **Deployment**, **Observability**, **Overview** → интеграция и контроль.
- Агенты используют эту таблицу для распределения усилий и анализа по зонам ответственности.
