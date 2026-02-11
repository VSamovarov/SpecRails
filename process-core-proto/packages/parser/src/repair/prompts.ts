/**
 * Промпты для Repairer
 *
 * Эти промпты специально написаны для исправления ошибок,
 * а не для генерации с нуля.
 */

import type { RepairContext } from "./types.js"
import type { ValidationIssue } from "../../../process-core/src/types.js"

/**
 * System промпт для Repairer
 *
 * Более строгий и сфокусированный на исправлении ошибок
 */
export const REPAIR_SYSTEM_PROMPT = `You are a DSL repair specialist.

Your task: Fix INVALID process DSL to make it VALID.

You will be given:
1. Original user input (what they wanted)
2. Invalid DSL (what was generated)
3. Validation errors (what's wrong)

You must:
- Fix ONLY the errors mentioned
- Keep everything else unchanged
- Follow the contract schema strictly
- Return valid JSON

CRITICAL RULES:
1. Use "label" not "name" for all labels
2. Use "lane" not "lane_id" for lane references
3. IDs must be snake_case: /^[a-z][a-z0-9_]*$/
4. All steps must have: id, label, lane
5. All steps except entry must have "next" (string or BranchNext)
6. Entry step must NOT have "next"

Be precise. Fix the exact issues. Don't reinvent.`

/**
 * User промпт для Repairer
 *
 * Собирает всю информацию об ошибке в понятный формат
 */
export function buildRepairPrompt(context: RepairContext): string {
  const { userInput, invalidDSL, validationErrors } = context

  return `# Fix this invalid DSL

## What the user wanted
"${userInput}"

## Invalid DSL that was generated
\`\`\`json
${JSON.stringify(invalidDSL, null, 2)}
\`\`\`

## Validation errors
${formatValidationErrors(validationErrors)}

## Your task
Fix the DSL above to pass validation. Return ONLY the corrected JSON, nothing else.

Focus on:
- Fixing field names (label vs name, lane vs lane_id)
- Fixing ID format (must be snake_case)
- Fixing structure (next, entry, etc)

Return the complete corrected DSL as valid JSON.`
}

/**
 * Форматирует ошибки валидации в понятный текст
 */
function formatValidationErrors(errors: ValidationIssue[]): string {
  if (errors.length === 0) {
    return "No errors"
  }

  return errors
    .map((err, i) => {
      const parts = [`${i + 1}. ${err.message}`]

      if (err.path) {
        parts.push(`   Path: ${err.path}`)
      }

      if (err.code) {
        parts.push(`   Code: ${err.code}`)
      }

      if (err.stepId) {
        parts.push(`   Step: ${err.stepId}`)
      }

      return parts.join("\n")
    })
    .join("\n\n")
}
