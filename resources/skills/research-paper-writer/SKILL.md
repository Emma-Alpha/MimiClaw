---
name: research-paper-writer
description: "Research Paper Writer: write structured academic papers, theses, and research reports with real-time literature search via Perplexity API. Generate outlines, write sections with proper citations, format in academic style, and ensure argumentative coherence. Use when: the user wants to write an academic paper, thesis chapter, research report, scientific article, conference paper, or any formal academic writing with citations and references."
metadata: { "openclaw": { "emoji": "📝" } }
---

## Setup
Get Perplexity API key at https://www.perplexity.ai/settings/api
Set `PERPLEXITY_API_KEY` in PetClaw settings.

## Literature Search via Perplexity
```bash
# Real-time academic search with citations
curl -X POST "https://api.perplexity.ai/chat/completions" \
  -H "Authorization: Bearer $PERPLEXITY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "sonar-pro",
    "messages": [{"role": "user", "content": "Find recent academic papers on: <TOPIC>. Include citations."}]
  }'
```

## Paper Writing Workflow

### Step 1: Topic & Scope
Clarify:
- Research question or thesis statement
- Target journal/conference or purpose (course paper, thesis, etc.)
- Required length and citation style (APA, MLA, Chicago, IEEE)
- Deadline and current progress

### Step 2: Literature Review
- Search Perplexity for recent papers (past 2-5 years)
- Identify 10-20 key sources
- Organize by theme/argument
- Note seminal works vs. recent contributions

### Step 3: Outline Generation
```
1. Abstract (150-250 words)
2. Introduction
   - Background & motivation
   - Research gap
   - Thesis statement
   - Paper structure overview
3. Literature Review / Related Work
4. Methodology
5. Results / Analysis
6. Discussion
7. Conclusion
8. References
```

### Step 4: Section Writing
Write each section with:
- Clear topic sentences
- Evidence from literature (with in-text citations)
- Logical flow and transitions
- Academic vocabulary and tone
- Appropriate hedging language

### Step 5: Citation Formatting

**APA 7th:**
> Author, A. A. (Year). Title of article. *Journal Name*, *Volume*(Issue), pages. https://doi.org/xxx

**IEEE:**
> [1] A. Author, "Title," *Journal*, vol. X, no. Y, pp. Z-ZZ, Year.

**Chicago:**
> Author Last, First. "Title." *Journal* Volume, no. Issue (Year): Pages.

### Step 6: Review & Polish
- Check argument coherence
- Verify all citations are formatted correctly
- Ensure abstract covers: background, method, results, conclusion
- Check word count and section balance

## Academic Writing Principles
- One claim per paragraph, supported by evidence
- Use hedging: "suggests," "indicates," "may," rather than absolute claims
- Distinguish your contribution from cited works
- Define technical terms on first use
- Passive voice acceptable in Methods; active preferred elsewhere
