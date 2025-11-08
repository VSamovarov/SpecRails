---
version: 2.0
status: draft
reviewed_by: AI Agent
last_updated: 2025-11-09
---

# 🚀 Быстрый старт CI/CD для SpecRails

Как интегрировать SpecRails в процесс CI/CD для автоматической проверки спецификаций.

---

## 🎯 Что проверяет CI/CD

SpecRails в CI/CD автоматически проверяет:

1. ✅ **Валидность всех DSL** — корректность синтаксиса и структуры
2. ✅ **Соответствие контрактам** — проверка по JSON Schema
3. ✅ **Контроль дрейфа** — стабильность AI между версиями
4. ✅ **Целостность модулей** — проверка контрольных сумм

---

## 📦 Установка SpecRails CLI

### npm

```bash
npm install -g @specrails/cli
```

### Проверка установки

```bash
specrails --version
```

---

## ⚙️ GitHub Actions

### Базовая конфигурация

Создайте файл `.github/workflows/specrails.yml`:

```yaml
name: SpecRails Validation

on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [main]

jobs:
  validate:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Install SpecRails CLI
        run: npm install -g @specrails/cli
      
      - name: Validate all specifications
        run: specrails validate --all --strict
      
      - name: Check drift
        run: specrails check drift --threshold 0.05
      
      - name: Generate report
        if: always()
        run: specrails report --format html --output ./reports/
      
      - name: Upload report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: specrails-report
          path: ./reports/
```

---

### Расширенная конфигурация с уведомлениями

```yaml
name: SpecRails Validation

on:
  pull_request:
    branches: [main, develop]

jobs:
  validate:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Install SpecRails
        run: npm install -g @specrails/cli
      
      - name: Validate specifications
        id: validate
        run: |
          specrails validate --all --strict --json > validation-result.json
          echo "result=$(cat validation-result.json | jq -r '.status')" >> $GITHUB_OUTPUT
      
      - name: Check drift
        id: drift
        run: |
          specrails check drift --threshold 0.05 --json > drift-result.json
          echo "score=$(cat drift-result.json | jq -r '.score')" >> $GITHUB_OUTPUT
      
      - name: Comment on PR
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          script: |
            const validation = '${{ steps.validate.outputs.result }}';
            const drift = '${{ steps.drift.outputs.score }}';
            
            const body = `## SpecRails Validation Report
            
            **Validation:** ${validation === 'passed' ? '✅ Passed' : '❌ Failed'}
            **Drift Score:** ${drift} (threshold: 0.05)
            
            ${drift > 0.05 ? '⚠️ Warning: Drift threshold exceeded!' : '✅ Drift within acceptable range'}
            `;
            
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: body
            });
      
      - name: Fail if validation failed
        if: steps.validate.outputs.result != 'passed'
        run: exit 1
```

---

## 🔧 GitLab CI

Создайте файл `.gitlab-ci.yml`:

```yaml
stages:
  - validate
  - report

specrails-validate:
  stage: validate
  image: node:20
  
  before_script:
    - npm install -g @specrails/cli
  
  script:
    - specrails validate --all --strict
    - specrails check drift --threshold 0.05
  
  artifacts:
    when: always
    paths:
      - reports/
    reports:
      junit: reports/junit.xml

specrails-report:
  stage: report
  image: node:20
  
  before_script:
    - npm install -g @specrails/cli
  
  script:
    - specrails report --format html --output ./reports/
  
  artifacts:
    paths:
      - reports/
  
  only:
    - merge_requests
    - main
```

---

## 🏗️ Jenkins

Создайте `Jenkinsfile`:

```groovy
pipeline {
    agent any
    
    tools {
        nodejs 'NodeJS 20'
    }
    
    stages {
        stage('Install') {
            steps {
                sh 'npm install -g @specrails/cli'
            }
        }
        
        stage('Validate') {
            steps {
                sh 'specrails validate --all --strict'
            }
        }
        
        stage('Drift Check') {
            steps {
                script {
                    def result = sh(
                        script: 'specrails check drift --threshold 0.05 --json',
                        returnStdout: true
                    ).trim()
                    
                    def drift = readJSON text: result
                    
                    if (drift.score > 0.05) {
                        echo "⚠️ Warning: Drift score ${drift.score} exceeds threshold"
                        currentBuild.result = 'UNSTABLE'
                    }
                }
            }
        }
        
        stage('Generate Report') {
            steps {
                sh 'specrails report --format html --output ./reports/'
            }
        }
    }
    
    post {
        always {
            publishHTML([
                allowMissing: false,
                alwaysLinkToLastBuild: true,
                keepAll: true,
                reportDir: 'reports',
                reportFiles: 'index.html',
                reportName: 'SpecRails Report'
            ])
        }
    }
}
```

---

## 🔍 Команды SpecRails CLI

### Валидация всех спецификаций

```bash
specrails validate --all
```

**Опции:**
- `--strict` — строгий режим (любая ошибка = failure)
- `--contracts` — проверить только контракты
- `--json` — вывод в JSON формате

---

### Проверка конкретного файла

```bash
specrails validate --file path/to/spec.yaml
```

---

### Проверка дрейфа

```bash
specrails check drift --threshold 0.05
```

**Опции:**
- `--baseline <ref>` — эталонная версия (тег или commit)
- `--contracts` — проверить только контракты
- `--json` — вывод в JSON

---

### Генерация отчёта

```bash
specrails report --format html --output ./reports/
```

**Форматы:**
- `html` — HTML отчёт
- `json` — JSON данные
- `junit` — JUnit XML для CI

---

## 📊 Примеры вывода

### Успешная валидация

```bash
$ specrails validate --all

✅ Validating specifications...
✅ All 47 specifications passed validation
✅ No errors found

Summary:
  Total: 47
  Passed: 47
  Failed: 0
  Warnings: 0
```

---

### Валидация с ошибками

```bash
$ specrails validate --all

❌ Validating specifications...

Errors:
  form.student.v1.yaml:
    - field: email
      issue: missing required attribute 'required'
      line: 15
    
  model.teacher.v1.yaml:
    - field: birthDate
      issue: invalid type, must be 'date'
      line: 23

Summary:
  Total: 47
  Passed: 45
  Failed: 2
  Warnings: 0
```

---

### Проверка дрейфа

```bash
$ specrails check drift --threshold 0.05

📊 Checking drift against baseline v0.1...

Contract: form.contract.v2
  Baseline: 2025-10-15
  Current score: 0.023
  Status: ✅ Stable

Contract: model.contract.v1
  Baseline: 2025-10-10
  Current score: 0.087
  Status: ⚠️ Exceeds threshold

Summary:
  Total contracts: 8
  Stable: 7
  Drift detected: 1
  Action required: Yes
```

---

## 🚨 Обработка ошибок

### Блокировка merge при ошибках

GitHub Actions автоматически блокирует merge, если:
- ❌ Валидация не прошла (`specrails validate` вернул код ошибки)
- ❌ Дрейф превысил порог

---

### Warnings vs Errors

**Error** — блокирует:
- Синтаксические ошибки
- Структурные нарушения
- Critical drift (> 0.15)

**Warning** — не блокирует, но сообщает:
- Medium drift (0.05 - 0.15)
- Deprecated contracts
- Missing optional fields

---

## 📋 Конфигурация проекта

Создайте `.specrails.yml` в корне проекта:

```yaml
# SpecRails Configuration
version: 1.0

validation:
  strict_mode: true
  fail_on_warnings: false
  include:
    - "specs/**/*.yaml"
    - "forms/**/*.form.yaml"
  exclude:
    - "**/*.test.yaml"
    - "**/*.draft.yaml"

drift:
  enabled: true
  threshold: 0.05
  baseline_ref: "main"
  check_contracts: true

reports:
  output_dir: "./reports"
  formats:
    - html
    - json
  
contracts:
  registry_path: "./contracts"
  require_approval: true
  
telemetry:
  enabled: true
  anonymize: true
```

---

## 🔐 Секреты и переменные

Если используете приватный SpecRails Registry:

### GitHub Actions

```yaml
env:
  SPECRAILS_TOKEN: ${{ secrets.SPECRAILS_TOKEN }}
  SPECRAILS_REGISTRY: https://registry.specrails.io
```

### GitLab CI

```yaml
variables:
  SPECRAILS_TOKEN: $SPECRAILS_TOKEN
  SPECRAILS_REGISTRY: https://registry.specrails.io
```

---

## ✅ Лучшие практики

### 1. Проверяйте при каждом PR

```yaml
on:
  pull_request:
    branches: [main, develop]
```

---

### 2. Используйте строгий режим

```bash
specrails validate --all --strict
```

Любая ошибка = failure, нельзя смержить.

---

### 3. Контролируйте drift

```bash
specrails check drift --threshold 0.05
```

Не допускайте накопления изменений в AI.

---

### 4. Сохраняйте отчёты

```yaml
- name: Upload report
  uses: actions/upload-artifact@v4
  with:
    name: specrails-report
    path: ./reports/
```

История проверок помогает отладке.

---

### 5. Уведомляйте команду

```yaml
- name: Notify Slack
  if: failure()
  uses: slackapi/slack-github-action@v1
  with:
    payload: |
      {
        "text": "❌ SpecRails validation failed in ${{ github.repository }}"
      }
```

---

## 🎯 Итоги

**Минимальная настройка:**
1. Установить SpecRails CLI
2. Создать workflow файл
3. Добавить `specrails validate --all`

**Полная настройка:**
1. Конфигурация `.specrails.yml`
2. Drift контроль
3. Генерация отчётов
4. Уведомления
5. Блокировка merge

---

## 📚 Связанные документы

- [Governance Policy Matrix](SpecRails_Governance_Policy_Matrix.md) — политики валидации
- [Observability Framework](SpecRails_Observability_Framework.md) — метрики и drift
- [Validation Loop](SpecRails_Validation_Loop_Principle.md) — как работает валидация
