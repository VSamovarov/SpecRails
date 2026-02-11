# SpecRails — Process Core Prototype (DSL/Contract/Parser/Validator)

This is a **working core prototype** for the SpecRails "Process" experiment:

- minimal Process DSL v1 (YAML)
- proposal contract (JSON Schema) returned by AI
- validator (schema + semantic rules)
- normalizer + YAML emitter
- Parser = **single AI gateway** (interface + mock provider)
- CLI to run extraction end-to-end

## What you get

- `specrails process:extract "<free text>"` → prints **valid YAML DSL** or validation errors.
- Deterministic core: Validator + Normalizer do not depend on AI.
- AI is isolated behind `Parser` and a contract.

## Quick start

Requirements: Node.js 18+

```bash
npm install
npm run build
node dist/cli.js process:extract "Школа государственная? если да — проверка департаментом, если нет — автопроверки. Потом решение."
```

By default it uses a **mock AI provider** (no network).  
To integrate a real provider, implement `AiProvider` in `packages/parser/src/providers/`.

## Layout

- `packages/process-core` — DSL types, validator, normalizer, YAML emitter
- `packages/parser` — Parser interface + contract runner + providers
- `contracts/process.v1.extract.schema.json` — AI output contract schema
- `src/cli.ts` — CLI entry

## Philosophy

- Parser is the **only** component that talks to AI.
- Validator is the source of truth for correctness.
- If AI output is invalid, we run a short **repair loop** with explicit issues.
