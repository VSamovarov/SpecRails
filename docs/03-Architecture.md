# SpecRails — Architecture

## Уровни
```
User
 ↓
Command Layer (/form, /model, /acl, /fsm)
 ↓
SpecRails Runtime (rules, context, validators, templates)
 ↓
AI Engine Adapter
 ↓
LLM Model
```

## Компоненты
- Action Invoker
- Context Collector
- Spec Template
- AI Transform Module
- Validator
- Preview Layer
- Engine Adapter

## Свойства
- Скрытая AI‑конфигурация
- Заменяемые модели
- Экспортируемый формат, не «ответ»
- Версионируемая логика
