/**
 * Repair module — исправление невалидного DSL
 *
 * Экспортирует все необходимое для работы с Repairer
 */

export { Repairer, createRepairer } from "./repairer.js"
export type { ValidateFn } from "./repairer.js"
export type { RepairConfig, RepairContext, RepairResult } from "./types.js"
export { REPAIR_SYSTEM_PROMPT, buildRepairPrompt } from "./prompts.js"
