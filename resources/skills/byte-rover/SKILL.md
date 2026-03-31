---
name: byte-rover
description: "ByteRover Project Knowledge Management: build and query a persistent knowledge graph of your codebase, documentation, and project notes. Index files and directories, search by semantic meaning, track architectural decisions, and maintain a living project wiki that grows with your work. Use when: the user wants to understand a codebase, find where something is implemented, track architectural decisions, create project documentation, search across project files by meaning, or build a persistent knowledge base about a project."
metadata: { "openclaw": { "emoji": "🚀" } }
---

## Setup
1. Register at https://byterover.dev and get your API key
2. Set `BYTEROVER_API_KEY` in PetClaw settings
3. Install MCP server:
```bash
npx @byteroverinc/byterover-mcp
```

## Core Operations

### Index a Project
```bash
# Index current directory
byterover index --path /path/to/project --key $BYTEROVER_API_KEY

# Index specific file types
byterover index --path /path/to/project --include "*.ts,*.py,*.md" --key $BYTEROVER_API_KEY
```

### Semantic Search
```bash
# Search by meaning (not just keywords)
byterover search "how is authentication handled" --key $BYTEROVER_API_KEY

# Search within a specific project
byterover search "database schema" --project my-app --key $BYTEROVER_API_KEY
```

### Query Knowledge Graph
```bash
# Find where a function is defined
byterover query "where is UserService implemented" --key $BYTEROVER_API_KEY

# Find all files related to a concept
byterover related "payment processing" --key $BYTEROVER_API_KEY
```

### Save Architectural Decision
```bash
# Record an ADR (Architectural Decision Record)
byterover note add --title "Use Redis for caching" \
  --content "Decision: Use Redis instead of in-memory cache for scalability" \
  --tags "architecture,caching" --key $BYTEROVER_API_KEY
```

## Workflow
1. When user asks about their project, first check if it's indexed (`byterover status`)
2. If not indexed, offer to index the current directory
3. Use semantic search to find relevant code/docs
4. Present findings with file paths and line numbers
5. Allow follow-up questions that build on previous results

## Knowledge Categories
- **Code**: Functions, classes, modules, APIs
- **Architecture**: Design decisions, data flows, system boundaries  
- **Docs**: README, wikis, comments, ADRs
- **History**: Git commits, change rationale
