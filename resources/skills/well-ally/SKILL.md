---
name: well-ally
description: "WellAlly Health Manager: track and manage personal health data including symptoms, medications, appointments, and wellness metrics. Record health logs, analyze trends, prepare doctor visit summaries, and get evidence-based health information. Use when: the user wants to log symptoms, track medications, record a health measurement, prepare for a doctor appointment, review their health history, understand a medical term, get wellness advice, or manage their health records."
metadata: { "openclaw": { "emoji": "🏥" } }
---

## Setup
Set `CLAUDE_API_KEY` in PetClaw settings. Health data is stored locally at `~/.wellally/`.

## Data Storage (Local, Private)
```
~/.wellally/
  health-log.json       # All health entries
  medications.json      # Medication schedule
  appointments.json     # Doctor appointments
  metrics.json          # Weight, BP, glucose, etc.
```

## Core Operations

### Log a Symptom
```json
// Append to ~/.wellally/health-log.json
{
  "date": "2026-03-10T09:30:00",
  "type": "symptom",
  "description": "Headache, mild, frontal area",
  "severity": 3,
  "duration": "2 hours",
  "possible_triggers": ["poor sleep", "dehydration"],
  "notes": "Went away after drinking water"
}
```

### Track Medication
```json
// ~/.wellally/medications.json
{
  "name": "Vitamin D3",
  "dose": "2000 IU",
  "frequency": "daily",
  "time": "08:00",
  "startDate": "2026-01-01",
  "reminders": true
}
```

### Record Metrics
```json
// ~/.wellally/metrics.json entries
{
  "date": "2026-03-10",
  "weight": 68.5,
  "bloodPressure": "120/80",
  "heartRate": 72,
  "sleepHours": 7.5,
  "steps": 8432,
  "waterIntake": 2.1
}
```

### Prepare Doctor Visit Summary
When user says "I have a doctor appointment" or "prepare my health summary":
1. Read last 30 days of health-log.json
2. List all current medications
3. Identify symptom patterns and trends
4. Format as a clear, structured summary:

```
## Health Summary for Doctor Visit
**Period**: [Date range]

### Current Medications
- [med name] [dose] [frequency]

### Symptoms Reported
| Date | Symptom | Severity | Duration |
|------|---------|----------|---------|
| ...  | ...     | ...      | ...     |

### Key Health Metrics
- Average weight: X kg
- BP range: X-Y mmHg
- Sleep average: X hours/night

### Questions for Doctor
[Based on patterns, suggest relevant questions]
```

### Trend Analysis
- Compare metrics over time (weight, BP, sleep)
- Identify symptom triggers
- Medication effectiveness tracking
- Alert if a metric looks concerning (e.g., BP consistently high)

## Privacy & Safety
- All data stored locally at `~/.wellally/` — never sent to cloud
- CLAUDE_API_KEY used only for natural language processing of queries
- Always recommend consulting a doctor for medical decisions
- This tool is for personal health tracking, not medical diagnosis
