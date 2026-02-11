/**
 * Типы для Repairer — компонента исправления невалидного DSL
 */

import type { ValidationIssue } from "../../../process-core/src/types.js"

/**
 * Результат работы Repairer
 */
export interface RepairResult {
  /** Успешно ли исправлен DSL */
  success: boolean

  /** Исправленный DSL (если success = true) */
  repairedDSL?: any

  /** Попытка номер */
  attempt: number

  /** Ошибки валидации после исправления */
  validationErrors?: ValidationIssue[]

  /** Причина неудачи (если success = false) */
  reason?: string
}

/**
 * Конфигурация для Repairer
 */
export interface RepairConfig {
  /** Максимальное количество попыток исправления */
  maxAttempts: number

  /** Нужно ли логировать процесс исправления */
  verbose: boolean
}

/**
 * Контекст для repair — вся информация об ошибке
 */
export interface RepairContext {
  /** Исходный текст от пользователя */
  userInput: string

  /** Невалидный DSL который нужно исправить */
  invalidDSL: any

  /** Ошибки валидации */
  validationErrors: ValidationIssue[]

  /** Имя контракта (например "process.v1.extract") */
  contractId: string
}
