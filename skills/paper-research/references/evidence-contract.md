# Evidence contract

## Evidence levels

| Level | Permitted basis | Claim boundary |
|---|---|---|
| `metadata` | Title, authors, venue, year, DOI, citation metadata | Existence, identity, publication context |
| `abstract` | Author abstract | High-level aim, method, and reported result only |
| `snippet` | Located body-text fragment | The exact local statement; surrounding context may be missing |
| `full_text` | Inspected full paper | Methods, parameters, limitations, and results supported by cited location |

Never promote an item to a higher level merely because a PDF URL exists. The content must have been inspected.

## Paper record

Each normalized paper should preserve:

```json
{
  "id": "doi:10.xxxx/example",
  "title": "Paper title",
  "authors": ["Author One"],
  "year": 2025,
  "venue": "Venue",
  "doi": "10.xxxx/example",
  "arxiv_id": null,
  "pmid": null,
  "url": "https://doi.org/10.xxxx/example",
  "abstract": null,
  "sources": ["crossref"],
  "open_access": "unknown",
  "retrieved_at": "2026-07-23T00:00:00.000Z"
}
```

## Claim record

Each synthesized claim should preserve:

```json
{
  "paper_id": "doi:10.xxxx/example",
  "claim": "Concise paraphrase",
  "evidence_level": "abstract",
  "locator": "abstract",
  "source": "crossref",
  "retrieved_at": "2026-07-23T00:00:00.000Z",
  "verified": false
}
```

Use `verified: true` only after inspecting the cited content at the stated locator.

## Research log

Record provider, exact query, filters, request time, returned count, error or rate-limit status, and output filename. Preserve exclusions with one of:

- duplicate
- outside_date_range
- wrong_population_or_domain
- wrong_intervention_or_method
- wrong_outcome
- non_scholarly
- inaccessible_for_required_full_text_review
