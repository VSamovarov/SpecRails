agent: architect
coi: false
version: 1.0

## 1. Executive Summary (≤ 6 bullets)
- Границы ядра разъезжаются: System Overview включает Preview и AI Adapter Hub в core вопреки Core Principle.
- Контрактная модель раздваивается между Prompt Registry и Runtime Manifest, рискуя потерять «один источник истины».
- Слой наблюдаемости расщеплён на три независимых документа с пересекающимися ролями и без единой архитектурной схемы.
- Validator с автоисправлениями в SDK нарушает заявленный цикл «AI → Core → Analyst» и может создавать скрытые побочные эффекты.
- Для MVP требуется упрощение: без консолидации governance/runtime/observability демонстрационная цепочка Text→DSL→Validation→Preview→CI/CD может расползтись.

## 2. Scores (0–5)
- consistency: 2
- feasibility: 3
- clarity: 3
- redundancy: 4
- risk: 3

## 3. Key Findings
- [F1] Нарушена логика Core Principle: `SpecRails_Core_Principle.md` выводит Preview и AI за пределы ядра, тогда как `SpecRails_System_Overview_Final_Architecture_Blueprint.md` называет их «внутренними модулями ядра».  
- [F2] Два разных реестра контрактов — `SpecRails_Prompt_Registry_and_Lifecycle.md` и `SpecRails_Runtime_Manifest_and_Module_Registry.md` — описывают одинаковые сущности без явной иерархии, создавая риск двойного управления версиями.  
- [F3] Observability описана тремя наборами компонентов (`SpecRails_Observability_and_Telemetry_Layer.md`, `SpecRails_Operational_Runtime_and_Observability_Layer.md`, `SpecRails_Prompt_Observability_and_Drift_Control.md`) с дублированием Drift Analyzer и Telemetry Engine, что мешает определить ответственных и данные потоков.  
- [F4] `SpecRails_SDK_Overview_and_Extension_API.md` позволяет ValidatorAPI «auto_fix», обходя AI и аналитика, что противоречит `SpecRails Validation Loop Principle.md` (Core — арбитр, но не автор DSL).

## 4. Contradictions & Gaps
| Where (doc/section) | Issue | Severity (low/med/high) | Fix suggestion |
|---|---|---|---|
| SpecRails_Core_Principle.md vs SpecRails_System_Overview_Final_Architecture_Blueprint.md | Preview и AI Adapter Hub одновременно названы и внешним окружением, и «внутренним модулем ядра» | high | Принять единый boundary: либо вынести Preview/AI Adapter в отдельный слой в System Overview, либо скорректировать Core Principle |
| SpecRails_Prompt_Registry_and_Lifecycle.md + SpecRails_Runtime_Manifest_and_Module_Registry.md | Контракты объявлены и в Prompt Registry, и в Runtime Manifest без указания приоритетов | med | Описать отношение «источник (Prompt Registry) → кэш (Runtime Manifest)» или объединить в одну модель |
| SpecRails_Observability_and_Telemetry_Layer.md + SpecRails_Operational_Runtime_and_Observability_Layer.md + SpecRails_Prompt_Observability_and_Drift_Control.md | Три разных Drift Analyzer / Telemetry Engine, без разграничения ответственности | med | Свести в единый Observability Blueprint с подслоями (runtime, prompt, governance) и общей шиной данных |
| SpecRails_SDK_Overview_and_Extension_API.md (ValidatorAPI) vs SpecRails Validation Loop Principle.md | Auto-fix Validator нарушает обязательность цикла «AI исправляет → аналитик утверждает» | med | Ограничить ValidatorAPI ролью проверки и отчёта, а автоматическое исправление перенести в Guided Feedback Loop |

## 5. MVP Recommendations
- Must-have (прямо сейчас):
	- Синхронизировать определение границ ядра между Core Principle и System Overview.
	- Зафиксировать единую модель хранения и публикации Prompt Contracts (Registry ↔ Manifest).
	- Объединить документы наблюдаемости в один контур с чёткими потоками данных и ролями.
- Defer (следующий релиз):
	- Формализовать связь Context Orchestration с Runtime Manifest (где хранится активный контекст для модулей).
	- Описать, как CI/CD слой использует telemetry/drift данные (pipeline handshake).
- Remove/merge:
	- Слить `SpecRails_Observability_and_Telemetry_Layer.md` и `SpecRails_Operational_Runtime_and_Observability_Layer.md` в единый документ, оставив `SpecRails_Prompt_Observability_and_Drift_Control.md` как специализированный подраздел.
	- Убрать автоисправления из ValidatorAPI или перенести описание в Feedback Mechanism, чтобы не плодить скрытые точки изменений.

## 6. Risk Register
| Risk | Impact | Likelihood | Mitigation |
|---|---|---|---|
| Неопределённые границы ядра ведут к смешению ответственности и неконтролируемым зависимостям AI ↔ Core | high | medium | Зафиксировать архитектурный layer diagram и обновить System Overview/Core Principle в одном PR |
| Дублирование контрактных реестров создаёт конфликты версий и дрейф схем | medium | medium | Ввести master-source правило и описать синхронизацию Manifest с Registry |
| Расщеплённый Observability слой не даёт собрать полные метрики для CI/CD и drift-контроля | medium | high | Консолидировать сбор метрик и единый Drift Analyzer с чёткими интерфейсами |
| Validator auto-fix может обойти Governance и внести невалидированный DSL | medium | medium | Ограничить ValidatorAPI ролью проверки, перенаправлять исправления через Feedback Loop |

## 7. Proposed Edits (Patch Hints, optional)
- `SpecRails_System_Overview_Final_Architecture_Blueprint.md`: заменить раздел «Внутренние модули ядра» на «Core + Adjacent Layers», вынеся Preview Engine и AI Adapter Hub в отдельные слои.
- `SpecRails_Runtime_Manifest_and_Module_Registry.md`: добавить примечание, что раздел `contracts` синхронизируется из Prompt Registry и не является источником правды.
- `SpecRails_SDK_Overview_and_Extension_API.md`: уточнить, что `auto_fix` генерирует предложение для Feedback Loop, а не молчаливо модифицирует DSL.

## 8. Final Verdict (2–3 предложения)
> Архитектурная рамка SpecRails описана богато, но ключевые границы между Core, AI и Observability пересекаются, что мешает поддерживать единую логику «Text → DSL → Validation → Preview → CI/CD → Observability». Необходимо синхронизировать определения слоёв, централизовать контрактный реестр и упростить наблюдаемость, иначе система рискует потерять воспроизводимость и управляемость drifтом на этапе MVP.
