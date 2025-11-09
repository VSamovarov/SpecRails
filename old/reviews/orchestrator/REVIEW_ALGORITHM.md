# Review Runbook (Multi-Agent)

## Prereqs
- В папке `/reviews/input/` подготовить `DOCUMENTS_INDEX.md` и положить все тексты.
- Агентам выдать: соответствующий AGENT_*_PROMPT.md + RESPONSE_FORMAT.md + DOCUMENTS_INDEX.md + тексты.

## Steps
1) Prep
    - Обнови `DOCUMENTS_INDEX.md` (список файлов, 1–2 строки описания каждого).
    - Зафиксируй commit SHA для воспроизводимости.

2) Run Agents (параллельно)
    - Agent A (architect) → читает всё, делает структурный аудит.
    - Agent B (ux) → читает аннотации + выборочно полные тексты.
    - Agent C (mvp) → читает Core/Runtime/SDK/Preview, остальное по ссылкам.

3) Collect
    - Собери три отчёта в `/reviews/output/`:
        - `review_architect.md`, `review_ux.md`, `review_mvp.md`.

4) Synthesize
    - Запусти мета-объединение (можно тем же LLM):
        - Вход: 3 отчёта
        - Задача: свести противоречия, объединить рекомендации, составить единый plan.

5) Gate/Decision
    - Определи список правок документов (PRs).
    - Определи MVP-срез (список артефактов и сценарий демо).
    - Создай задачи/Issues.

## Automation Hints
- GitHub Actions job:
    - step 1: собрать index
    - step 2: запустить трёх агентов (3 API вызова)
    - step 3: сшить мета-отчёт
    - artifacts: `/reviews/output/*`
