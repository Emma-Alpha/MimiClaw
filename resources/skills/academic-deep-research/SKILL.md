---
name: academic-deep-research
description: "Academic Deep Research: conduct comprehensive, multi-stage academic research using Gemini's deep research capabilities. Execute systematic literature reviews with 8-stage methodology: query formulation, database search, source credibility scoring, content extraction, synthesis, gap identification, citation formatting, and report generation. Use when: the user needs thorough academic research, a comprehensive literature review, in-depth investigation of a research topic, evidence-based analysis, or a detailed research report with citations."
metadata: { "openclaw": { "emoji": "🔬" } }
---

## Setup
Set `GEMINI_API_KEY` in PetClaw settings. Get free key at https://aistudio.google.com/app/apikey

## 8-Stage Research Methodology

### Stage 1: Query Formulation
- Decompose research question into sub-questions
- Identify key concepts and synonyms
- Define scope: time range, disciplines, geographic focus

### Stage 2: Multi-Database Search
Search across: arXiv, PubMed, Semantic Scholar, OpenAlex, Google Scholar
```bash
# Use Gemini API for intelligent query expansion
curl -X POST "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=$GEMINI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"contents":[{"parts":[{"text":"Generate 5 search query variations for: <TOPIC>"}]}]}'
```

### Stage 3: Source Credibility Scoring
Rate each source on:
- Journal impact factor / conference tier
- Citation count and recency
- Author credentials
- Methodological rigor
- Replication status

Score: A (highly credible) → D (questionable)

### Stage 4: Content Extraction
For each credible source:
- Extract main argument/finding
- Note methodology
- Identify limitations
- Record key statistics/data

### Stage 5: Synthesis
- Group papers by theme
- Identify convergent findings
- Map conflicting results
- Build evidence hierarchy

### Stage 6: Gap Identification
- What questions remain unanswered?
- Where is evidence weakest?
- What future research is needed?

### Stage 7: Citation Formatting
Support: APA 7th, MLA 9th, Chicago 17th, Vancouver, BibTeX

### Stage 8: Report Generation
Produce structured research report with:
- Executive summary
- Methodology
- Findings by theme
- Evidence quality assessment
- Research gaps
- Conclusion
- Full bibliography

## Output Format
```markdown
# Research Report: <Topic>
**Date**: <date>  **Scope**: <X papers, Y databases>

## Executive Summary
...

## Findings
### Theme 1: ...
### Theme 2: ...

## Research Gaps
...

## Bibliography
...
```
