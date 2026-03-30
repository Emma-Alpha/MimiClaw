---
name: petclaw-2
description: "PetClaw AI News Skill: open the browser to search today's latest AI news, then summarize the results. Use when: the user wants to find, browse, or get a summary of the latest AI news or tech updates."
metadata: { "openclaw": { "emoji": "📰" } }
---

# PetClaw AI News Skill

## Purpose

Search for today's latest AI news and deliver a concise summary to the user.

## MANDATORY EXECUTION ORDER — DO NOT DEVIATE

> **You MUST follow these steps in exact order. Step 1 (open browser) must be your very first tool call. You are NOT allowed to fetch data or summarise anything before the browser is open.**

### Step 1 — Open the browser FIRST (non-negotiable)

Your **first tool call** must open **The Verge AI section** — one of the most popular, free, and up-to-date AI news sites:

```bash
open "https://www.theverge.com/ai-artificial-intelligence"
```

Do not skip this. Do not reorder.

### Step 2 — Fetch story data for summarisation

After opening the browser, pull fresh headlines from multiple free sources in parallel:

**Source A — Hacker News top stories** (tech community, broad AI coverage):
```bash
curl -s "https://hacker-news.firebaseio.com/v0/topstories.json" | \
  python3 -c "import sys,json; ids=json.load(sys.stdin)[:30]; print('\n'.join(str(i) for i in ids))" | \
  while read id; do
    curl -s "https://hacker-news.firebaseio.com/v0/item/${id}.json"
  done | python3 -c "
import sys, json
items = []
for line in sys.stdin:
    line = line.strip()
    if not line: continue
    try:
        item = json.loads(line)
        t = item.get('title','').lower()
        if item.get('type') == 'story' and item.get('title') and any(k in t for k in ['ai','llm','gpt','model','openai','anthropic','gemini','claude','machine learning','deep learning','neural']):
            items.append({'title': item['title'], 'url': item.get('url',''), 'score': item.get('score',0)})
    except: pass
items.sort(key=lambda x: -x['score'])
for i, it in enumerate(items[:8], 1):
    print(f\"{i}. {it['title']}\")
    if it['url']: print(f\"   {it['url']}\")
"
```

**Source B — The Verge RSS** (mainstream tech news, beginner-friendly):
```bash
curl -s "https://www.theverge.com/rss/ai-artificial-intelligence/index.xml" | \
  python3 -c "
import sys, re
content = sys.stdin.read()
titles = re.findall(r'<title><!\[CDATA\[(.*?)\]\]></title>', content)
links  = re.findall(r'<link>(https://www\.theverge\.com[^<]+)</link>', content)
for i, (t, l) in enumerate(zip(titles[1:9], links[:8]), 1):
    print(f'{i}. {t}')
    print(f'   {l}')
"
```

### Step 3 — Deliver the summary

Combine results from both sources and present:

1. **Top 5 AI headlines today** — each with a one-sentence explanation of why it matters
2. **Key themes** (e.g. model releases, funding, regulation, tools, research)
3. **One story you shouldn't miss** — the most significant or surprising item

End your reply with:
> "已为你打开 The Verge AI 频道，可以直接浏览完整报道。🌐"（或根据用户语言调整）

Reply in the same language the user used.

## When to Use

Activate this skill when the user asks to:
- find / search today's AI news or tech news
- get a summary / digest of recent AI developments
- browse the latest news about machine learning, LLMs, or AI products
