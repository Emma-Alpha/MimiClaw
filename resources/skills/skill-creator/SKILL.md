---
name: skill-creator
description: Create new skills, modify and improve existing skills. Use when users want to create a skill from scratch, edit an existing skill, or want help writing a SKILL.md file for PetClaw.
metadata: { "openclaw": { "emoji": "🛠️" } }
---

# Skill Creator

A skill for designing and writing PetClaw skills step by step.

The process:
1. Understand what the user wants the skill to do
2. Interview them on details and edge cases
3. Write a SKILL.md draft
4. Run a quick sanity check (manually test with the user)
5. Iterate based on feedback
6. Run the **skill-auditor** security review before saving

---

## Step 1: Capture Intent

Start by understanding what the user needs. If the current conversation already shows a workflow they want to capture, extract it from the history first.

Ask:
1. What should this skill enable PetClaw to do?
2. When should it trigger? (what phrases or contexts)
3. What should the output look like?

Keep the conversation casual and adapt to the user's technical level.

---

## Step 2: Interview & Research

Before writing, ask about:
- Edge cases and failure modes
- Input formats (files, text, structured data?)
- Success criteria — how will they know it worked?
- Any external tools, APIs, or commands the skill needs

Don't start writing until the intent is clear.

---

## Step 3: Write the SKILL.md

### File structure

```
skill-name/
├── SKILL.md          ← required
└── references/       ← optional, for large reference docs
```

### SKILL.md format

```markdown
---
name: skill-name
description: What this skill does and when to use it. Be specific about trigger contexts. (This is PetClaw's primary trigger mechanism)
compatibility:
  tools:
    - tool_name   # only if required
---

# Skill Title

Brief overview of what this skill does.

## Steps / Instructions

[The actual instructions for PetClaw to follow]
```

### Writing tips

- **description** is the trigger — include both what the skill does AND when to use it. Make it slightly "pushy" so PetClaw doesn't undertrigger. Example: instead of "Format commit messages", write "Format commit messages. Use this whenever the user mentions commits, git history, or asks how to write a good commit."

- **Keep it under 300 lines** — if it's getting long, move reference material to a `references/` subfolder and tell the skill when to read it.

- **Imperative form** — write instructions as commands: "Open the file", "Check if X exists", "Return the result as JSON".

- **Explain the why** — instead of just "Do X", explain why X matters. PetClaw follows reasoning better than bare rules.

- **No malware or deception** — the skill must not request credentials, access unrelated files, or do anything that would surprise the user if they read it.

### Example output format pattern

```markdown
## Output format
Always respond using this structure:
### Summary
[one sentence]
### Details
[bullet points]
```

---

## Step 4: Test It

After writing the draft, suggest 2–3 realistic prompts the user might actually say. Follow the skill's instructions yourself and show the user the result.

Ask: "Does this look right? What would you change?"

Iterate — rewrite the skill based on feedback, then re-test.

---

## Step 5: Security Review (MANDATORY)

Before saving the skill, you **must** invoke the **skill-auditor** skill to vet the SKILL.md content.

- If the verdict is ✅ **SAFE TO INSTALL** or ⚠️ **INSTALL WITH CAUTION** (LOW/MEDIUM risk) → save the skill.
- If the verdict is ❌ **DO NOT INSTALL** or risk is HIGH/EXTREME → show the findings to the user and wait for their decision.

Never skip this step.

---

## Step 6: Save the Skill

**Do not just show the content — you must write it to disk using shell commands.**

First create the directory:

```bash
mkdir -p ~/.openclaw/workspace/skills/<skill-id>
```

Then write the full SKILL.md using `tee` with a heredoc (replace the content between the markers with the actual SKILL.md you drafted):

```bash
tee ~/.openclaw/workspace/skills/<skill-id>/SKILL.md << 'SKILLEOF'
---
name: ...
description: ...
---

# ...

[full skill content here]
SKILLEOF
```

After writing, verify it was saved correctly:

```bash
cat ~/.openclaw/workspace/skills/<skill-id>/SKILL.md
```

Only after confirming the file exists on disk, inform the user (reply in the user's language):
- The skill has been saved successfully.
- They must **start a new chat session** to use it — skills are loaded at session start, so the current conversation cannot activate the new skill.
- In the new session, saying something that matches the skill's trigger description will activate it automatically.
- They can click the **refresh button (↻)** in the PetClaw Skills panel to see it appear in the Custom tab.

---

## Updating an Existing Skill

If the user wants to edit an existing skill:
- Preserve the original `name` in the frontmatter
- Read the current SKILL.md first before making changes
- After editing, re-run the skill-auditor review
- Use the same `tee` heredoc method above to overwrite the file at its existing path — do not just show the updated content, actually write it to disk
