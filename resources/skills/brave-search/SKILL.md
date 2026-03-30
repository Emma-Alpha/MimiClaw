---
name: brave-search
description: "Web Search (Brave): perform real-time web searches using Brave Search API to find current information, news, facts, tutorials, and any web content. Returns relevant results with titles, URLs, and descriptions. Use when: the user wants to search the internet, find current information, look up recent news, research a topic online, find websites or resources, or get information that may have changed since training data."
metadata: { "openclaw": { "emoji": "🔍" } }
---

## Setup
Register at https://api.search.brave.com/app/keys for a free API key (2,000 searches/month free).
Set `BRAVE_SEARCH_API_KEY` in PetClaw settings.

## Core Search
```bash
# Web search
curl -s "https://api.search.brave.com/res/v1/web/search?q=<QUERY>&count=10" \
  -H "Accept: application/json" \
  -H "X-Subscription-Token: $BRAVE_SEARCH_API_KEY"

# News search
curl -s "https://api.search.brave.com/res/v1/news/search?q=<QUERY>&count=5&freshness=pd" \
  -H "Accept: application/json" \
  -H "X-Subscription-Token: $BRAVE_SEARCH_API_KEY"
```

## Search Parameters
- `count`: results per page (max 20)
- `freshness`: `pd` (past day), `pw` (past week), `pm` (past month)
- `country`: `US`, `CN`, `GB`, etc.
- `search_lang`: `en`, `zh-hans`, etc.

## Result Processing
Parse the JSON response and present:
```
## Search Results for: "<query>"

1. **[Title]**
   <URL>
   <Description snippet>

2. ...
```

## Workflow
1. Identify the user's search intent
2. Formulate an effective search query (use quotes for exact phrases, add context keywords)
3. Execute search via API
4. Parse and rank results by relevance
5. Summarize key findings with source links
6. Offer to search for more specific sub-topics
