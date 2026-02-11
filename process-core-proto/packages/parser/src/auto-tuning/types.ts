/**
 * Единый интерфейс для автокорректируемых AI компонентов
 * 
 * Принципы:
 * - YAGNI: Реализуем только то, что используем
 * - KISS: Простой и понятный интерфейс
 * - DRY: Не дублируем логику автокоррекции
 * 
 * @example
 * ```typescript
 * class Parser implements AutoTunable<string, DSL> {
 *   id = "parser"
 *   task = "parse text to DSL"
 *   promptVersion = "v2.0.0"
 *   
 *   async execute(input: string): Promise<DSL> {
 *     return await this.run({ userText: input, contractId: "process.v1.extract" })
 *   }
 *   
 *   validate(output: DSL): ValidationResult {
 *     return validateSpecV1(output, { forbidCycles: true })
 *   }
 *   
 *   async getQualityMetric(): Promise<number> {
 *     const recentResults = await telemetry.getRecent("parser", 100)
 *     return recentResults.filter(r => r.ok).length / recentResults.length
 *   }
 * }
 * ```
 */

/**
 * Базовый интерфейс для автокорректируемого компонента
 * 
 * Phase 1 (сейчас): Только обязательные методы
 * - execute(): делает работу
 * - validate(): проверяет результат
 * - getQualityMetric(): возвращает метрику качества
 */
export interface AutoTunable<Input, Output> {
  // ========== Идентификация ==========
  
  /** Уникальный идентификатор компонента */
  id: string
  
  /** Описание задачи компонента */
  task: string
  
  /** Версия используемого промпта */
  promptVersion: string
  
  // ========== Основная работа ==========
  
  /** 
   * Выполнить задачу
   * @param input - входные данные
   * @returns результат работы
   */
  execute(input: Input): Promise<Output>
  
  // ========== Обратная связь ==========
  
  /** 
   * Проверить качество результата
   * @param output - результат execute()
   * @returns результат валидации
   */
  validate(output: Output): ValidationResult
  
  /** 
   * Вычислить метрику качества (0-1)
   * 
   * Для Parser: % успешных валидаций
   * Для Meta-AI: средний % улучшения промптов
   * 
   * @returns число от 0 до 1, где 1 = идеально
   */
  getQualityMetric(): Promise<number>
}

/**
 * Расширенный интерфейс для будущего (Phase 2-3)
 * 
 * Добавляет методы для автоулучшения:
 * - collectErrorData(): собирает данные об ошибках
 * - autoImprove(): улучшает сам себя через Meta-AI
 */
export interface AutoTunableAdvanced<Input, Output> extends AutoTunable<Input, Output> {
  // ========== Сбор данных (Phase 2) ==========
  
  /** 
   * Собрать данные об ошибках для анализа
   * @returns структурированные данные об ошибках
   */
  collectErrorData(): Promise<ErrorData>
  
  // ========== Автоулучшение (Phase 2-3) ==========
  
  /** Meta-AI для улучшения промпта (опционально) */
  metaImprover?: MetaImprover
  
  /** 
   * Улучшить промпт через Meta-AI
   * @returns результат улучшения с A/B тестом
   */
  autoImprove?(): Promise<ImprovementResult>
}

/**
 * Результат валидации (универсальный)
 */
export interface ValidationResult {
  /** Результат успешен */
  ok: boolean
  
  /** Список ошибок (если ok = false) */
  errors?: ValidationError[]
}

/**
 * Ошибка валидации
 */
export interface ValidationError {
  /** Текст ошибки */
  message: string
  
  /** Путь к полю (если применимо) */
  path?: string
  
  /** Серьёзность */
  severity: "error" | "warning"
  
  /** Код ошибки (опционально) */
  code?: string
}

/**
 * Данные об ошибках для анализа Meta-AI
 */
export interface ErrorData {
  /** Общее количество попыток */
  total: number
  
  /** Процент ошибок (0-1) */
  errorRate: number
  
  /** Паттерны ошибок */
  patterns: ErrorPattern[]
}

/**
 * Паттерн ошибки
 */
export interface ErrorPattern {
  /** Описание паттерна */
  pattern: string
  
  /** Сколько раз встречается */
  frequency: number
  
  /** Примеры ошибок */
  examples: ErrorExample[]
}

/**
 * Пример ошибки
 */
export interface ErrorExample {
  /** Входные данные */
  input: unknown
  
  /** Результат (неправильный) */
  output: unknown
  
  /** Ошибки валидации */
  errors: ValidationError[]
  
  /** Ожидаемый результат (если есть) */
  expected?: unknown
}

/**
 * Результат автоулучшения
 */
export interface ImprovementResult {
  /** Улучшение применено успешно */
  success: boolean
  
  /** Старая версия промпта */
  oldVersion: string
  
  /** Новая версия промпта */
  newVersion: string
  
  /** Процент улучшения (-1 до +1, где 0.1 = +10%) */
  improvement: number
  
  /** Применено автоматически (или требует одобрения) */
  appliedAutomatically: boolean
  
  /** Причина (если не применено автоматически) */
  reason?: string
  
  /** Данные A/B теста */
  abTest?: ABTestResult
}

/**
 * Результат A/B теста
 */
export interface ABTestResult {
  /** Метрика старой версии */
  oldMetric: number
  
  /** Метрика новой версии */
  newMetric: number
  
  /** Количество тестов */
  sampleSize: number
  
  /** Статистическая значимость */
  pValue?: number
}

/**
 * Meta-AI для улучшения промптов
 */
export interface MetaImprover {
  /** Идентификатор Meta-AI */
  id: string
  
  /** 
   * Улучшить промпт на основе данных об ошибках
   * 
   * @param currentPrompt - текущий промпт
   * @param errorData - данные об ошибках
   * @returns улучшенный промпт
   */
  improvePrompt(
    currentPrompt: string,
    errorData: ErrorData
  ): Promise<ImprovedPrompt>
  
  /** 
   * A/B тест двух промптов
   * 
   * @param oldPrompt - старый промпт
   * @param newPrompt - новый промпт
   * @param testData - тестовые данные
   * @returns результат сравнения
   */
  abTest(
    oldPrompt: string,
    newPrompt: string,
    testData: unknown[]
  ): Promise<ABTestResult>
}

/**
 * Улучшенный промпт
 */
export interface ImprovedPrompt {
  /** Новый текст промпта */
  prompt: string
  
  /** Версия */
  version: string
  
  /** Что изменилось */
  changes: string[]
  
  /** Ожидаемое улучшение (0-1) */
  expectedImprovement: number
}

/**
 * Телеметрия для компонента
 */
export interface Telemetry {
  /**
   * Записать результат выполнения
   */
  record(
    componentId: string,
    input: unknown,
    output: unknown,
    validation: ValidationResult,
    duration: number
  ): Promise<void>
  
  /**
   * Получить последние результаты
   */
  getRecent(
    componentId: string,
    limit: number
  ): Promise<TelemetryEntry[]>
  
  /**
   * Собрать данные об ошибках
   */
  collectErrors(
    componentId: string,
    since?: Date
  ): Promise<ErrorData>
}

/**
 * Запись телеметрии
 */
export interface TelemetryEntry {
  /** Временная метка */
  timestamp: Date
  
  /** ID компонента */
  componentId: string
  
  /** Входные данные */
  input: unknown
  
  /** Результат */
  output: unknown
  
  /** Результат валидации */
  validation: ValidationResult
  
  /** Длительность в мс */
  duration: number
  
  /** Версия промпта */
  promptVersion: string
}
