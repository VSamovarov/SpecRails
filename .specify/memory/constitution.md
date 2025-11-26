<!--
Sync Impact Report:
- Version change: 0.0.0 → 1.0.0
- List of modified principles:
    - [PRINCIPLE_1_NAME] → I. Контроль важнее магии (Control Over Magic)
    - [PRINCIPLE_2_NAME] → II. Трехслойная архитектура (3-Layer Architecture)
    - [PRINCIPLE_3_NAME] → III. Документация как исходный код (Docs-as-Code)
    - [PRINCIPLE_4_NAME] → IV. Общение на основе контрактов (Contract-Based Communication)
    - [PRINCIPLE_5_NAME] → V. Русский язык как стандарт (Russian Language Standard)
- Added sections: None
- Removed sections: [SECTION_2_NAME], [SECTION_3_NAME]
- Templates requiring updates:
    - ✅ c:\Server\SpecRails\.specify\emplates\plan-template.md (No changes needed)
    - ✅ c:\Server\SpecRails\.specify\emplates\spec-template.md (No changes needed)
    - ✅ c:\Server\SpecRails\.specify\emplates\asks-template.md (No changes needed)
- Follow-up TODOs: None
-->
# SpecRails Constitution

## Core Principles

### I. Контроль важнее магии (Control Over Magic)
ИИ действует как предсказуемая утилита, а не как непредсказуемый творец. Детерминизм и предсказуемость являются приоритетом над "магическими" решениями.

### II. Трехслойная архитектура (3-Layer Architecture)
Система строго разделена на слои `Core`, `Process` и `Governance` с однонаправленными зависимостями (`Core` ← `Process` ← `Governance`), обеспечивая изоляцию и понятность.

### III. Документация как исходный код (Docs-as-Code)
Архитектурные решения и принципы фиксируются в директории `docs/` и являются источником истины. Любые изменения в архитектуре должны сначала отражаться в документации.

### IV. Общение на основе контрактов (Contract-Based Communication)
Взаимодействие между слоями осуществляется через строго определенные Объекты Передачи Данных (DTO). JSON Schema для этих DTO, расположенные в `schemas/`, являются источником истины для всех структур данных.

### V. Русский язык как стандарт (Russian Language Standard)
Вся документация, комментарии в коде и проектная коммуникация ведутся на русском языке для обеспечения однозначности, ясности и снижения когнитивной нагрузки на команду.

## Governance
Эта конституция является высшим авторитетом в проекте и отменяет любые практики, противоречащие ей. Поправки требуют документированного процесса утверждения и плана миграции. Все запросы на слияние (Pull Requests) и их ревью должны в обязательном порядке проверять соответствие кода и документации этим принципам.

**Version**: 1.0.0 | **Ratified**: 2025-11-18 | **Last Amended**: 2025-11-18

