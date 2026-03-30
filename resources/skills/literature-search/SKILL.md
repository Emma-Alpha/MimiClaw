---
name: literature-search
description: "Literature Search: search and retrieve academic papers, articles, and research from multiple free scholarly databases including arXiv, PubMed, Semantic Scholar, OpenAlex, Crossref, and Google Scholar. Summarize findings, extract key insights, format citations, and compile literature reviews. Use when: the user wants to find academic papers, search for research on a topic, get citations, review existing literature, find the latest studies, check what research exists on a subject, or build a bibliography."
metadata: { "openclaw": { "emoji": "📚" } }
---

## Supported Databases (All Free, No API Key Required)

| Database | Coverage | Best For |
|---|---|---|
| **arXiv** | Physics, CS, Math, Biology | Preprints, cutting-edge research |
| **PubMed** | Biomedical, Life Sciences | Medical research, clinical studies |
| **Semantic Scholar** | All fields | AI-powered relevance ranking |
| **OpenAlex** | All fields | Broad academic search, open access |
| **Crossref** | All fields | DOI lookup, citation data |

## Search Strategy

### 1. Query Formulation
- Break topic into key concepts
- Identify synonyms and related terms
- Use Boolean operators: AND, OR, NOT
- Add year filters for recency

### 2. Multi-Database Search
```bash
# arXiv API (free, no key)
curl "https://export.arxiv.org/api/query?search_query=<query>&max_results=10"

# Semantic Scholar API (free, no key)
curl "https://api.semanticscholar.org/graph/v1/paper/search?query=<query>&fields=title,authors,year,abstract,citationCount"

# PubMed API (free, no key)
curl "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=<query>&retmax=10&format=json"
```

### 3. Result Processing
- Rank by relevance and citation count
- Filter by year range if specified
- Extract: title, authors, year, abstract, DOI, citation count

### 4. Output Format
Present results as:
```
## Search Results for: "<query>"
Found X papers across Y databases

### 1. [Paper Title] (Year)
**Authors**: ...
**Source**: arXiv / PubMed / ...
**Citations**: N
**Abstract**: ...
**DOI/Link**: ...
```

### 5. Literature Review Mode
When user asks for a literature review:
- Group papers by theme/approach
- Identify consensus and controversies
- Highlight most-cited works
- Note research gaps
- Generate formatted bibliography (APA/MLA/Chicago/BibTeX)
