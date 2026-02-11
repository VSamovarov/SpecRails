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

# By default uses Mock provider (no real AI)
node dist/src/cli.js process:extract "School public? yes -> review; no -> auto checks."

# Or use real AI providers (see AI Providers section below)
GEMINI_API_KEY=your_key node dist/src/cli.js process:extract "School public? yes -> review."
```

### Using Real AI Providers

This prototype supports multiple AI providers:

- **Google Gemini** (recommended for free tier) — [docs/ai-providers/gemini.md](docs/ai-providers/gemini.md)
- **Groq** (very fast, free) — [docs/ai-providers/groq.md](docs/ai-providers/groq.md)
- **OpenAI** (best quality, paid) — [docs/ai-providers/openai.md](docs/ai-providers/openai.md)

**Setup:**

1. Get an API key from one of the providers (see docs above)
2. Copy `.env.example` to `.env` and add your key:

```bash
cp .env.example .env
# Edit .env and uncomment your provider
```

3. Run CLI — it will automatically detect and use the provider:

```bash
npm run build
node dist/src/cli.js process:extract "Your text here..."
```

**Priority:** `GEMINI_API_KEY` > `GROQ_API_KEY` > `OPENAI_API_KEY` > Mock

See [docs/ai-providers/README.md](docs/ai-providers/README.md) for detailed comparison and setup instructions.

## Layout

- `packages/process-core` — DSL types, validator, normalizer, YAML emitter
- `packages/parser` — Parser interface + contract runner + providers
- `contracts/process.v1.extract.schema.json` — AI output contract schema
- `src/cli.ts` — CLI entry

## Philosophy

- Parser is the **only** component that talks to AI.
- Validator is the source of truth for correctness.
- If AI output is invalid, we run a short **repair loop** with explicit issues.
