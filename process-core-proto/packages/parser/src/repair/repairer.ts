/**
 * Repairer — исправляет невалидный DSL
 *
 * Работает так:
 * 1. Получает невалидный DSL + ошибки валидации
 * 2. Спрашивает AI (с repair промптом) как исправить
 * 3. Валидирует результат
 * 4. Если не помогло — повторяет (до maxAttempts)
 */

import type { AiProvider } from "../types.js"
import type { RepairConfig, RepairContext, RepairResult } from "./types.js"
import type { ValidationResult } from "../../../process-core/src/types.js"
import { REPAIR_SYSTEM_PROMPT, buildRepairPrompt } from "./prompts.js"

/**
 * Функция валидации DSL
 * Передается извне, чтобы Repairer не зависел от конкретного валидатора
 */
export type ValidateFn = (dsl: any) => ValidationResult

/**
 * Класс Repairer
 *
 * Простой и понятный: один метод repair(), который исправляет DSL
 */
export class Repairer {
  constructor(
    private aiProvider: AiProvider,
    private validateFn: ValidateFn,
    private config: RepairConfig = { maxAttempts: 3, verbose: true }
  ) {}

  /**
   * Исправить невалидный DSL
   *
   * @param context - Контекст с информацией об ошибке
   * @returns Результат исправления
   */
  async repair(context: RepairContext): Promise<RepairResult> {
    if (this.config.verbose) {
      console.log(`\n🔧 Starting DSL repair...`)
      console.log(`   Errors to fix: ${context.validationErrors.length}`)
      console.log(`   Max attempts: ${this.config.maxAttempts}`)
    }

    let currentDSL = context.invalidDSL
    let currentErrors = context.validationErrors

    // Пробуем до maxAttempts раз
    for (let attempt = 1; attempt <= this.config.maxAttempts; attempt++) {
      if (this.config.verbose) {
        console.log(`\n   Attempt ${attempt}/${this.config.maxAttempts}...`)
      }

      try {
        // Просим AI исправить
        const repaired = await this.askAiToRepair({
          ...context,
          invalidDSL: currentDSL,
          validationErrors: currentErrors,
        })

        // Валидируем результат
        const validation = this.validateFn(repaired)

        if (validation.ok) {
          // ✅ Успех!
          if (this.config.verbose) {
            console.log(`   ✅ DSL repaired successfully!`)
          }

          return {
            success: true,
            repairedDSL: repaired,
            attempt,
          }
        } else {
          // ❌ Все еще невалидно, попробуем еще раз
          if (this.config.verbose) {
            console.log(`   ❌ Still invalid (${validation.issues.length} errors)`)
          }

          currentDSL = repaired
          currentErrors = validation.issues
        }
      } catch (error) {
        // Ошибка при вызове AI или парсинге JSON
        const errorMessage = error instanceof Error ? error.message : String(error)
        if (this.config.verbose) {
          console.log(`   ⚠️  Error during repair: ${errorMessage}`)
        }

        if (attempt === this.config.maxAttempts) {
          return {
            success: false,
            attempt,
            reason: `AI error: ${errorMessage}`,
          }
        }
      }
    }

    // Исчерпали все попытки
    return {
      success: false,
      attempt: this.config.maxAttempts,
      validationErrors: currentErrors,
      reason: `Max attempts (${this.config.maxAttempts}) reached, still invalid`,
    }
  }

  /**
   * Спросить AI как исправить DSL
   *
   * @private
   */
  private async askAiToRepair(context: RepairContext): Promise<any> {
    const prompt = buildRepairPrompt(context)

    // Вызываем AI через runStructured
    const response = await this.aiProvider.runStructured<any>({
      system: REPAIR_SYSTEM_PROMPT,
      prompt,
      schema: {}, // Пустая схема, т.к. мы просто хотим JSON
    })

    // Возвращаем данные (уже распарсены провайдером)
    return response.data
  }

  // Метод parseJsonFromResponse больше не нужен,
  // т.к. runStructured уже возвращает распарсенный data
}

/**
 * Удобная функция для создания Repairer с дефолтными настройками
 */
export function createRepairer(
  aiProvider: AiProvider,
  validateFn: ValidateFn,
  config?: Partial<RepairConfig>
): Repairer {
  const fullConfig: RepairConfig = {
    maxAttempts: config?.maxAttempts ?? 3,
    verbose: config?.verbose ?? true,
  }

  return new Repairer(aiProvider, validateFn, fullConfig)
}
