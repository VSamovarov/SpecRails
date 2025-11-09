version: 2.0
status: draft
reviewed_by: AI Agent
last_updated: 2025-11-09
 
# 🚀 CI/CD Quick Start — принцип и интеграция

Документ описывает интеграцию SpecRails в конвейеры CI/CD: валидация DSL/контрактов, drift‑контроль, проверка целостности и формирование аудита. Фокус: концептуальные шаги и минимальные конфигурации. Сохранены практичные YAML/Groovy примеры.

---

## 🎯 Цели пайплайна
1. Формальная валидность спецификаций.
2. Соответствие контрактам и схемам.
3. Drift контроль (стабильность генерации).
4. Проверка целостности модулей / контрактов.
5. Аудит и репорты (прослеживаемость изменений).

---

## 📦 Установка CLI
```bash
npm install -g @specrails/cli
specrails --version
```

---

## ⚙️ GitHub Actions
### Минимальная конфигурация (`.github/workflows/specrails.yml`)

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

### Расширенный вариант (с уведомлениями и drift статусом)

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

## 🔧 GitLab CI (`.gitlab-ci.yml`)

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

## 🏗️ Jenkins (`Jenkinsfile`)

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

## 🔍 Основные CLI команды
### Валидация всех спецификаций
```bash
specrails validate --all --strict
```
Опции: `--contracts`, `--json`.

---

### Валидация конкретного файла
```bash
specrails validate --file path/to/spec.yaml --strict
```

---

### Drift контроль
```bash
specrails check drift --threshold 0.05 --baseline main --json
```
Опции: `--baseline <ref>`, `--contracts`, `--json`.

---

### Генерация отчёта
```bash
specrails report --format html --output ./reports/
```
Форматы: `html`, `json`, `junit`.

---

## 📊 Примеры вывода
### Успех

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

### Ошибки

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

### Drift отчёт

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

## 🚨 Ошибки и блокировки
Merge блокируется если:
– Валидация не пройдена.
– Drift > порога.

---

### Warnings vs Errors
Error блокирует (синтаксис, структура, critical drift >0.15). Warning информирует (medium drift, deprecated, опциональные поля).

---

## 📋 Конфигурация (.specrails.yml)

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

## 🔐 Секреты / переменные
Для приватного Registry:

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

## ✅ Практики
### 1. Проверка на каждый PR

```yaml
on:
  pull_request:
    branches: [main, develop]
```

---

### 2. Строгий режим

```bash
specrails validate --all --strict
```

Любая ошибка = failure, нельзя смержить.

---

### 3. Регулярный drift контроль

```bash
specrails check drift --threshold 0.05
```

Не допускайте накопления изменений в AI.

---

### 4. Архивация отчётов

```yaml
- name: Upload report
  uses: actions/upload-artifact@v4
  with:
    name: specrails-report
    path: ./reports/
```

История проверок помогает отладке.

---

### 5. Алерты команде

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

## 🎯 Резюме
Минимум: установка CLI + workflow + validate. Полно: конфигурация, drift мониторинг, отчёты, уведомления, блокировки.

---

## 📚 Связанные документы
– `SpecRails_Governance_Policy_Matrix.md`
– `SpecRails_Observability_Framework.md`
– `SpecRails_Validation_Loop_Principle.md`
– `SpecRails_Prompt_Registry_and_Runtime_Manifest.md`
