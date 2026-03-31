---
name: self-improving-agent
description: "Self-Improving Agent: continuously learn from every conversation and evolve your capabilities. After each session, extract insights, patterns, and preferences from the interaction and store them in a persistent memory file (~/.openclaw/self-memory.md). Automatically reference past learnings to improve future responses. Use when: the user wants Claude to remember their preferences, learn from mistakes, adapt to their working style, improve over time, or build a personalized AI experience. Also activate when starting a new session to load accumulated learnings."
metadata: { "openclaw": { "emoji": "🧠" } }
---

## Memory File Location
`~/.openclaw/self-memory.md`

## Core Behaviors

**On session start**: Read `~/.openclaw/self-memory.md` if it exists. Silently apply all stored preferences and learnings.

**During conversation**: Note patterns, user preferences, correction patterns, and successful strategies.

**On session end (when user says goodbye or closes)**: Append new learnings to memory file in structured format:
```
## [Date] Session Learnings
- [Preference/Pattern/Correction observed]
```

**Continuous improvement loop**:
1. Read past learnings → apply them proactively
2. Observe new patterns → extract insights
3. Write new learnings → persist for future
4. Self-reflect on mistakes → document corrections

## Memory Categories
- **Preferences**: Communication style, format, language, detail level
- **Domain knowledge**: User's technical context, stack, expertise areas
- **Workflow patterns**: How user approaches problems, favorite tools
- **Corrections**: Things Claude got wrong and how to avoid them
- **Successes**: Approaches that worked particularly well
