---
name: task-scheduler
description: "Task Scheduler: create, manage, and monitor scheduled tasks on macOS and Windows using natural language. Convert plain English time descriptions to cron expressions or Windows schedules, create recurring automations, list scheduled tasks, and manage system schedulers. Use when: the user wants to schedule a task, create a recurring reminder or automation, set up a cron job, run something every day/week/hour, schedule a script to run automatically, view or cancel scheduled tasks."
metadata: { "openclaw": { "emoji": "⏱️" } }
---

## Platform Rule

Always match the scheduler to the current OS:
- macOS: use `launchctl` / LaunchAgents when possible; use `crontab` only as a fallback.
- Windows: use Windows Task Scheduler via `schtasks`.

Do not give macOS-only commands on Windows, and do not give Windows Task Scheduler commands on macOS.

## Natural Language Schedule Parsing

Parse these patterns:
- "every day at 9am"
- "every Monday at 8:30"
- "every hour"
- "every 15 minutes"
- "every weekday at noon"
- "first day of month at midnight"

Convert them to the platform's native schedule format:
- macOS fallback cron examples:
  - `0 9 * * *`
  - `30 8 * * 1`
  - `0 * * * *`
- Windows examples:
  - daily 09:00 -> `/sc daily /st 09:00`
  - weekly Monday 08:30 -> `/sc weekly /d MON /st 08:30`
  - hourly / every 15 minutes -> use `/sc minute /mo 60` or `/sc minute /mo 15`

## Core Operations

### Create a Scheduled Task

#### macOS preferred: LaunchAgent

```bash
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.user.<task-name>.plist
launchctl list | grep com.user
```

#### macOS fallback: cron

```bash
(crontab -l 2>/dev/null; echo "<cron_expression> <command>") | crontab -
```

#### Windows: Task Scheduler

```powershell
schtasks /create /tn "<task-name>" /tr "<command>" /sc daily /st 09:00 /f
```

Examples:

```powershell
schtasks /create /tn "PetClawDailyScript" /tr "powershell.exe -File C:\Scripts\daily.ps1" /sc daily /st 09:00 /f
schtasks /create /tn "PetClawEvery15Min" /tr "python C:\Scripts\job.py" /sc minute /mo 15 /f
```

### List All Scheduled Tasks

#### macOS

```bash
launchctl list | grep com.user
crontab -l
```

#### Windows

```powershell
schtasks /query /fo list /v
```

### Remove a Task

#### macOS LaunchAgent

```bash
launchctl bootout gui/$(id -u) ~/Library/LaunchAgents/com.user.<task-name>.plist
rm -f ~/Library/LaunchAgents/com.user.<task-name>.plist
```

#### macOS cron fallback

```bash
crontab -l | grep -v "<pattern_to_remove>" | crontab -
```

#### Windows

```powershell
schtasks /delete /tn "<task-name>" /f
```

### Check Recent Execution State

#### macOS

```bash
log show --predicate 'process == "cron"' --last 1h
launchctl print gui/$(id -u)/com.user.<task-name>
```

#### Windows

```powershell
Get-ScheduledTask -TaskName "<task-name>"
Get-ScheduledTaskInfo -TaskName "<task-name>"
```

## Workflow

1. Detect the current OS first.
2. Ask or infer: what task should run, what command or script should run, and what schedule is needed.
3. Convert the natural language schedule into the correct platform format.
4. Show the user the exact schedule and command before creating it when confirmation is appropriate.
5. Create the task using the platform-native scheduler.
6. Confirm the task name, cadence, and command.
7. Optionally test with a manual run:
   - macOS: run the underlying script or command directly.
   - Windows: `schtasks /run /tn "<task-name>"`.

## Notes

- On Windows, prefer `powershell.exe -File ...`, `cmd.exe /c ...`, or a direct executable path in `/tr`.
- On macOS, prefer LaunchAgents for desktop automations because they integrate better with user sessions than raw cron jobs.
- If the task needs a working directory, wrap it in a script file rather than trying to express complex shell setup inline.
