---
name: agent-browser
description: "Secure Web Browser: control a real web browser to navigate websites, click elements, fill forms, take screenshots, extract content, and perform web automation tasks safely. Use when: the user wants to browse a website, fill out a web form, take a screenshot of a webpage, extract content from a site, automate web interactions, log into a website, or perform any action that requires a browser."
metadata: { "openclaw": { "emoji": "🌐", "requires": { "bins": ["agent-browser"] }, "install": [{ "id": "npm-agent-browser", "label": "Install agent-browser (npm)", "command": "npm install -g agent-browser", "bins": ["agent-browser"] }] } }
---

## Setup
```bash
npm install -g agent-browser
```

## Core Commands

### Navigate & Screenshot
```bash
# Open URL and take screenshot
agent-browser screenshot --url "https://example.com" --output /tmp/screenshot.png

# Navigate and extract page content
agent-browser extract --url "https://example.com" --format text
```

### Interact with Pages
```bash
# Click an element
agent-browser click --url "https://example.com" --selector "#button-id"

# Fill a form
agent-browser fill --url "https://example.com" --selector "#input" --value "text"

# Submit form
agent-browser submit --url "https://example.com" --selector "form"
```

### Extract Data
```bash
# Extract links
agent-browser links --url "https://example.com"

# Extract structured data
agent-browser scrape --url "https://example.com" --selector ".article-content"
```

## Security Features
- Runs in sandboxed environment
- No persistent cookies between sessions (unless --persist flag used)
- Blocks tracking scripts by default
- Respects robots.txt

## Workflow
1. User describes the web task
2. Determine the target URL and required actions
3. Execute browser commands step by step
4. Present results or screenshots to user
5. Ask for confirmation before form submissions
