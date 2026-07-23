---
name: paper-research
description: Conduct evidence-traceable academic literature research with the paper-search MCP tools. Use when searching scholarly papers, expanding citations or references, checking journal metrics, locating open-access PDFs, finding body snippets, building reading lists or evidence tables, or visualizing citation networks, publication timelines, source coverage, and evidence matrices.
---

# Paper Research

Turn a research question into reproducible searches, normalized records, evidence-aware synthesis, and optional interactive views.

## Start

1. Record the research question, date range, domains, languages, and inclusion/exclusion criteria.
2. Read [source-routing.md](references/source-routing.md) and select at least two complementary sources unless the user requests a specific source.
3. Use the `paper-search` MCP server. It mirrors the complete runtime `paper-search tools` catalog, so use the original CLI tool name when provider-specific parameters matter.
4. Use `research_search_and_deduplicate` and `research_expand_citation_graph` for combined workflows. Use raw tools such as `search_crossref`, `search_openalex`, or `get_paper_references` for precise control.
5. Run `research_get_capability_status` before workflows that depend on API keys, publisher access, snippets, metrics, or PDF download.
6. Treat the bundled CLI as an implementation detail; call it directly only when diagnosing the MCP server.

Do not treat missing optional credentials as a failure of unrelated capabilities.

## Research

1. Search each chosen source separately so provenance remains visible.
2. Preserve raw JSON before normalization.
3. Deduplicate in this order: normalized DOI, arXiv ID, PMID/PMCID, then normalized title plus year.
4. Rank by topical relevance first. Treat citation count and journal metrics as context, not evidence quality.
5. Select core papers explicitly before expanding citations and references.
6. Resolve PDFs only after verifying the identifier. Prefer publisher-open, repository, arXiv, PubMed Central, and Unpaywall routes.
7. Keep Sci-Hub disabled unless the user explicitly enables the MCP server with `PAPER_SEARCH_ENABLE_SCIHUB=true`, requests its use, and confirms appropriate legal and institutional authorization.

## Evidence

Read [evidence-contract.md](references/evidence-contract.md) before synthesizing findings or writing files.

- Label every claim `metadata`, `abstract`, `snippet`, or `full_text`.
- Never present an abstract or snippet inference as a full-text finding.
- Attach a stable paper identifier, source, retrieval time, and evidence level to every extracted claim.
- State uncertainty and conflicting results rather than averaging them into one conclusion.

For a persistent research project, produce:

```text
research-question.md
search-log.md
papers.json
papers.csv
reading-list.md
evidence-table.md
bibliography.bib
pdf/
```

Only create the files the user needs. Restrict downloads to the selected project directory and never overwrite an existing PDF silently.

## Visualize

Read [visualize-contract.md](references/visualize-contract.md) when a graph or interactive comparison would materially help the user explore the result.

- Use Visualize for citation networks, publication timelines, source coverage, and evidence matrices.
- Pass normalized, bounded data rather than raw provider responses.
- Use DOI, Semantic Scholar ID, arXiv ID, PMID, or PMCID as drill-down identifiers.
- Let a selected paper send a follow-up request to expand citations or verify evidence.
- If Visualize is unavailable, use Mermaid for a small static network and Markdown tables for timelines or matrices.

Do not generate a visualization merely because the result contains numbers.

## Finish

Report:

1. Sources searched and the exact retrieval date.
2. Query variants and filters.
3. Counts before and after deduplication.
4. Papers excluded and the applied reason.
5. Evidence levels used in the synthesis.
6. Missing credentials, inaccessible full text, rate limits, and other coverage limitations.
