# Auto-Tuning Module

Единый модуль для каскада автокоррекции AI компонентов.

## Философия

**Человек определяет ЧТО:**
- Метрики успеха
- Критерии качества
- Golden examples

**AI находит КАК:**
- Пишет промпты
- Находит паттерны
- Оптимизирует

## Текущее состояние (Phase 1)

**Что есть:**
- ✅ Интерфейс `AutoTunable<Input, Output>`
- ✅ Базовые типы для валидации и телеметрии
- ✅ Интерфейс для будущего Meta-AI

**Что НЕ реализовано:**
- ❌ Полная реализация AutoTuningLoop
- ❌ Meta-AI компонент
- ❌ Каскад автокоррекции
- ❌ Dashboard

## Использование (Phase 1)

### Пример: Parser как AutoTunable

```typescript
import { AutoTunable, ValidationResult } from "./auto-tuning/index.js";
import { validateSpecV1 } from "@specrails/process-core";

class Parser implements AutoTunable<string, DSL> {
  id = "parser"
  task = "parse text to DSL"
  promptVersion = "v2.0.0"
  
  async execute(input: string): Promise<DSL> {
    // Существующая логика парсинга
    const result = await this.run({
      userText: input,
      contractId: "process.v1.extract"
    });
    
    return result.data;
  }
  
  validate(output: DSL): ValidationResult {
    const result = validateSpecV1(output, { forbidCycles: true });
    
    return {
      ok: result.ok,
      errors: result.issues?.map(issue => ({
        message: issue.message,
        path: issue.path?.join("."),
        severity: issue.severity || "error",
        code: issue.code
      }))
    };
  }
  
  async getQualityMetric(): Promise<number> {
    // Берём из телеметрии последние 100 результатов
    const recent = await telemetry.getRecent(this.id, 100);
    const successCount = recent.filter(r => r.validation.ok).length;
    
    return successCount / recent.length;
  }
}
```

### Пример: Базовая телеметрия

```typescript
import { Telemetry, TelemetryEntry } from "./auto-tuning/index.js";

class SimpleTelemetry implements Telemetry {
  private entries: TelemetryEntry[] = [];
  
  async record(
    componentId: string,
    input: unknown,
    output: unknown,
    validation: ValidationResult,
    duration: number
  ): Promise<void> {
    this.entries.push({
      timestamp: new Date(),
      componentId,
      input,
      output,
      validation,
      duration,
      promptVersion: "v2.0.0" // Из Prompt Registry
    });
    
    // Ограничиваем размер
    if (this.entries.length > 1000) {
      this.entries = this.entries.slice(-1000);
    }
  }
  
  async getRecent(componentId: string, limit: number): Promise<TelemetryEntry[]> {
    return this.entries
      .filter(e => e.componentId === componentId)
      .slice(-limit);
  }
  
  async collectErrors(componentId: string, since?: Date): Promise<ErrorData> {
    const entries = this.entries
      .filter(e => e.componentId === componentId)
      .filter(e => !since || e.timestamp >= since)
      .filter(e => !e.validation.ok);
    
    // Анализ паттернов ошибок
    const patterns = new Map<string, ErrorPattern>();
    
    for (const entry of entries) {
      const errors = entry.validation.errors || [];
      for (const error of errors) {
        const pattern = error.message;
        
        if (!patterns.has(pattern)) {
          patterns.set(pattern, {
            pattern,
            frequency: 0,
            examples: []
          });
        }
        
        const p = patterns.get(pattern)!;
        p.frequency++;
        p.examples.push({
          input: entry.input,
          output: entry.output,
          errors: [error]
        });
      }
    }
    
    return {
      total: this.entries.filter(e => e.componentId === componentId).length,
      errorRate: entries.length / this.entries.length,
      patterns: Array.from(patterns.values())
    };
  }
}
```

## Roadmap

### Phase 1: Интерфейс + Телеметрия (1 неделя) 🔄

- [x] Определить `AutoTunable` интерфейс
- [ ] Реализовать простую телеметрию
- [ ] Обернуть Parser в AutoTunable
- [ ] Собрать первые метрики

### Phase 2: Meta-AI (1-2 месяца)

- [ ] Реализовать `MetaImprover` интерфейс
- [ ] Создать Meta-AI для улучшения промптов
- [ ] Реализовать A/B тестирование
- [ ] Автоматическое улучшение при errorRate > 15%

### Phase 3: Каскад (2-3 месяца)

- [ ] Meta-AI как AutoTunable
- [ ] Meta-Meta-AI для улучшения Meta-AI
- [ ] AutoTuningCascade для управления
- [ ] Dashboard для человека

## Принципы разработки

**YAGNI:** Не реализуем Phase 2/3 пока не докажем ценность Phase 1

**KISS:** Интерфейс простой - только то, что нужно

**DRY:** Логика автокоррекции в одном месте, не дублируем

## Архитектура

```
AutoTunable Component
├── execute() ────────> Основная работа
├── validate() ───────> Проверка результата
└── getQualityMetric() ─> Метрики для Meta-AI

Meta-AI (AutoTunable)
├── improvePrompt() ──> Улучшает промпт компонента
└── abTest() ─────────> Сравнивает старый/новый

Telemetry
├── record() ─────────> Записывает результаты
├── getRecent() ──────> Последние N записей
└── collectErrors() ──> Данные для Meta-AI
```

## Метрики качества

### Parser
- **Success Rate:** % успешных валидаций
- **Target:** > 85%

### Meta-AI
- **Improvement Rate:** средний % улучшения промптов
- **Target:** > 10% на промпт

### Meta-Meta-AI (Phase 3)
- **Meta Improvement:** % улучшения качества Meta-AI
- **Target:** > 5% на итерацию

## Пример полного цикла (Phase 3)

```
1. Parser генерирует DSL
   ├─> Telemetry записывает результат
   └─> getQualityMetric() = 82% (ниже порога 85%)

2. Monitoring триггерит Meta-AI
   ├─> collectErrors() возвращает паттерны
   ├─> Meta-AI улучшает промпт
   └─> A/B тест: улучшение +15%

3. AutoTuningLoop применяет изменения
   ├─> Improvement > 10% → применить автоматически
   └─> Новая версия промпта v2.1.0

4. Parser использует новый промпт
   └─> getQualityMetric() = 93% ✅
```

## Next Steps

1. **Сейчас:** Реализовать базовую телеметрию
2. **На неделе:** Обернуть Parser в AutoTunable
3. **Через месяц:** Первый Meta-AI для Parser
4. **Через 2-3 месяца:** Полный каскад с dashboard
