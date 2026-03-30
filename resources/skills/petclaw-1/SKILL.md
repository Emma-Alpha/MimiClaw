---
name: petclaw-1
description: "PetClaw Calendar Skill: create calendar events on macOS using AppleScript, then open Calendar.app so the user can see the result. Use when: the user wants to add a schedule, create an event, book a meeting, or set a reminder."
metadata: { "openclaw": { "emoji": "📅" } }
---

# PetClaw Calendar Skill (macOS Calendar)

## Purpose

Create an event in macOS Calendar.app via AppleScript **and then open Calendar.app** so the user can visually confirm the newly added event.

> **IMPORTANT**: Always open Calendar.app after creating the event. The user must be able to see the result on screen.

## When to Use

Activate this skill whenever the user mentions:
- adding / creating a schedule or event
- booking a meeting or appointment
- setting a reminder or noting a time-based task

## How to Use

### Step 1 – Resolve the target date/time with shell `date`

```bash
# Example: "tomorrow at 3 PM" → one-hour event
START=$(date -v+1d -v15H -v0M -v0S "+%m/%d/%Y %H:%M:%S")
END=$(date -v+1d -v16H -v0M -v0S "+%m/%d/%Y %H:%M:%S")
```

Adjust `-v` flags to match the user's description (e.g. `-v+0d` for today, `-v9H` for 9 AM).

### Step 2 – Create the event via AppleScript

```bash
osascript -e "
tell application \"Calendar\"
  -- Use 'Home' calendar if it exists, otherwise fall back to the first available
  set calName to \"Home\"
  try
    set calRef to calendar calName
  on error
    set calRef to item 1 of (every calendar whose writable is true)
    set calName to name of calRef
  end try
  tell calRef
    set evtStart to date \"${START}\"
    set evtEnd   to date \"${END}\"
    make new event with properties {summary:\"<title>\", start date:evtStart, end date:evtEnd, description:\"<notes>\"}
  end tell
end tell
"
```

Replace `<title>` and `<notes>` with values parsed from the user's request.

### Step 3 – Open Calendar.app so the user can see it (REQUIRED)

**Always run this after creating the event.** This brings Calendar.app to the foreground.

```bash
open -a Calendar
```

### Step 4 – Confirm to the user

After both steps succeed, reply in natural language:
> "Done! I've added *<title>* to your **<calName>** calendar on <date> from <start time> to <end time>. Calendar is now open so you can check it. 🗓️"

## Tips

- List available calendars first if unsure which one to use:
  ```bash
  osascript -e 'tell application "Calendar" to name of every calendar'
  ```
- Default event duration is **1 hour** unless the user specifies otherwise.
- If the AppleScript call fails (e.g. Calendar.app not authorised), inform the user and suggest granting Calendar access in System Settings → Privacy & Security.

## Handling Different Systems & Failures

The steps above are written for standard macOS. If any step fails or behaves unexpectedly, **do not give up — adapt and try alternative approaches on your own**:

- **Date format mismatch**: macOS locale affects how AppleScript parses date strings. If `date "<string>"` fails, try alternative formats (`MM/DD/YYYY HH:MM:SS`, `YYYY-MM-DD HH:MM:SS`), or construct the date object field by field:
  ```applescript
  set d to current date
  set year of d to 2025
  set month of d to January
  set day of d to 15
  set hours of d to 14
  set minutes of d to 0
  set seconds of d to 0
  ```

- **Calendar name differs**: Not all systems have a "Home" calendar. Always fall back to listing available calendars and using the first writable one.

- **`osascript` permission denied**: Calendar.app may not have Automation permission. Inform the user and guide them: System Settings → Privacy & Security → Automation → allow Terminal / PetClaw to control Calendar.

- **Command not available**: If `date -v` (BSD syntax) is not supported, try GNU `date` syntax (`date -d "tomorrow 15:00"`) or use Python to compute the timestamp:
  ```bash
  python3 -c "from datetime import datetime, timedelta; ..."
  ```

- **General rule**: If the standard method doesn't work, reason about what the underlying system supports and try the most appropriate alternative. Explain to the user what you tried and what worked.
