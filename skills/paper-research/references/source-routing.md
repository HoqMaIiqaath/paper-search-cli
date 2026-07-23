# Source routing

## Selection

Choose at least one broad discovery source and one domain or citation source.

| Need | Preferred source | Complement |
|---|---|---|
| Broad DOI metadata | Crossref | OpenAlex |
| Citation discovery | Semantic Scholar | OpenAlex |
| AI and computer science | Semantic Scholar, DBLP | arXiv, OpenReview |
| Biomedical research | PubMed | Europe PMC, PubMed Central |
| Preprints | arXiv, bioRxiv, medRxiv | Semantic Scholar |
| Cryptography | IACR ePrint | DBLP |
| Open-access discovery | Unpaywall | CORE, OpenAIRE |
| Journal metrics | EasyScholar | None; it is not a paper search source |
| Institution-backed metadata | Web of Science, Scopus, IEEE | Crossref or OpenAlex |

## Rules

- Use Crossref or OpenAlex for broad first-pass discovery.
- Use Semantic Scholar for citation expansion and available body snippets.
- Use DBLP for computer-science bibliographic verification, not PDF retrieval.
- Use PubMed identifiers for biomedical verification and PubMed Central for open full text.
- Keep preprints visibly labeled; do not silently merge them with a later journal version.
- Treat Google Scholar page parsing as a discovery fallback whose stability may vary.
- Configure publisher APIs only when the user has the corresponding API or institutional entitlement.
- Record the provider for every result, even after deduplication.

## Query construction

Generate:

1. A precise query containing the central concept and outcome.
2. One synonym-expanded query.
3. One narrower query for methods, population, dataset, or evaluation.

Avoid sending one oversized Boolean expression to every provider. Adapt syntax and query length to the provider while preserving the conceptual search log.
