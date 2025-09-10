# Scout Cron Jobs

A comprehensive cron job scheduling system for Scout that runs LangGraph-based agents on schedules with strong provenance, safety, and reproducibility.

## Features

- **Local-first & private**: All logic, data, and logs stay on device
- **Deterministic & auditable**: Every run produces artifacts + metadata
- **Small surface**: Simple primitives (schedule → run → store → inspect)
- **Reasoning-aware**: Jobs run agent graphs with inputs, caps, and network scopes
- **Polite web behavior**: robots.txt, per-domain rate limits, and bandwidth caps

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Add a Job

Create a job definition file (YAML or JSON):

```yaml
id: my_web_watcher
name: "Web Watcher"
description: "Watch a website for changes"
schedule: "0 */4 * * *"  # Every 4 hours
timezone: "America/New_York"
graphId: "webwatcher.v1"
inputs:
  url: "https://example.com"
  selectors: [".content"]
```

### 3. Add the Job

```bash
npm run cron add examples/sample-cron-job.yaml
```

### 4. List Jobs

```bash
npm run cron list
```

### 5. Run a Job Manually

```bash
npm run cron run-now my_web_watcher
```

### 6. View Job Status

```bash
npm run cron show my_web_watcher
```

## CLI Commands

### Job Management

- `npm run cron add <job.yaml>` - Add a job from file
- `npm run cron list` - List all jobs
- `npm run cron show <job_id>` - Show job details
- `npm run cron pause <job_id>` - Pause a job
- `npm run cron resume <job_id>` - Resume a paused job
- `npm run cron delete <job_id>` - Delete a job

### Run Management

- `npm run cron run-now <job_id>` - Run job immediately
- `npm run cron run-now <job_id> --dry-run` - Dry run (simulation)
- `npm run cron tail <job_id>` - Show recent runs
- `npm run cron logs <run_id>` - Show run logs
- `npm run cron export <run_id> <path.zip>` - Export artifacts

### Scheduler

- `npm run cron process` - Process pending runs
- `npm run cron update-schedules` - Update all job schedules

## Job Definition Format

```yaml
# Basic Information
id: unique_job_id
version: "1.0.0"
name: "Job Name"
description: "What this job does"
owner: "your-name"

# Scheduling
schedule: "0 */4 * * *"        # Cron expression
timezone: "America/New_York"   # Timezone
jitterMs: 300000               # Random delay (0-5min)
catchup: true                  # Run missed executions
concurrency: "skip"            # allow|skip|queue|cancel-previous

# Execution
graphId: "agent_graph_id"
inputs:
  param1: "value1"
  param2: 42

# Resource Limits
resources:
  networkScope: "allowlist"     # none|localhost|allowlist|all
  allowlist: ["example.com"]
  rateLimits:
    "example.com": 10           # requests per minute
  maxBandwidth: 10485760        # bytes per second
  maxSteps: 15
  maxRunSeconds: 600
  maxModelTokens: 8000

# Retry Policy
retry:
  maxRetries: 3
  strategy: "exponential"       # immediate|exponential|linear
  delays: [60000, 300000, 1800000]  # retry delays in ms

# Alerts
alerts:
  onSuccess: false
  onFailure: true
  onMaterialChange: true

# Organization
labels:
  category: "monitoring"
  environment: "production"
```

## Scheduling

### Cron Expressions

Standard 5-field format: `MINUTE HOUR DAY MONTH DAYOFWEEK`

```bash
"0 * * * *"     # Every hour
"0 9 * * 1"     # Every Monday at 9:00
"*/15 * * * *"  # Every 15 minutes
"0 0 * * 0"     # Every Sunday at midnight
```

### Extended Syntax

```bash
"@hourly"      # Every hour
"@daily"       # Every day at midnight
"@weekly"      # Every week
"@monthly"     # Every month
```

### Timezones

All major timezones supported via IANA identifiers:

```yaml
timezone: "America/New_York"
timezone: "Europe/London"
timezone: "Asia/Tokyo"
timezone: "UTC"
```

## Concurrency Control

- **allow**: Multiple runs can execute simultaneously
- **skip**: Skip new run if job already running
- **queue**: Queue new runs (not implemented yet)
- **cancel-previous**: Cancel existing run before starting new one

## Resource Guards

### Network Scopes

- **none**: No network access
- **localhost**: Only localhost access
- **allowlist**: Only specified domains
- **all**: Full network access

### Rate Limiting

Per-domain request limits:

```yaml
rateLimits:
  "api.example.com": 60    # 60 requests per minute
  "*.google.com": 10       # 10 requests per minute
```

## Artifacts

Each job run creates an artifacts directory with:

```
artifacts/
└── job_id/
    └── timestamp_run_id/
        ├── metadata.json      # Job config, inputs, resource caps
        ├── stdout.log         # Structured execution logs
        ├── steps.json         # Step-by-step execution details
        ├── report.md          # Human-readable summary
        ├── snapshots/         # Screenshots, HTML dumps
        ├── cleaned/           # Normalized content (Markdown/JSON)
        └── diffs/             # Change detection results
```

## Safety & Sandboxing

- **Filesystem isolation**: Jobs run in bounded workspace directories
- **Network proxy**: Enforced network scopes and rate limits
- **Process whitelist**: Limited child process execution
- **Secrets management**: Local vault with explicit opt-in

## Development

### Building

```bash
npm run build
```

### Testing

```bash
npm test
```

### Type Checking

```bash
npm run type-check
```

## Architecture

### Components

1. **Scheduler**: Computes due runs using cron expressions
2. **Runner**: Executes jobs with resource guards and logging
3. **Database**: SQLite storage for jobs, runs, events, locks
4. **Graph Adapter**: Interface to LangGraph agent execution
5. **CLI**: Command-line interface for job management

### Data Flow

```
Job Definition → Scheduler → Database → Runner → Agent → Artifacts
     ↓             ↓            ↓         ↓       ↓         ↓
   YAML/JSON    Cron Parser  SQLite    Resource   LangGraph  Filesystem
```

## Future Extensions

- **Calendars**: Skip holidays, quiet hours
- **Dependencies**: Job B after Job A success
- **Rate pools**: Shared budgets across jobs
- **Distributed workers**: Multiple machines with shared queue
- **UI authoring**: Form-based job editor
