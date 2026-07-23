# Visualize contract

Use this contract only after normalization and deduplication.

## Citation network

```json
{
  "view": "citation_network",
  "nodes": [
    {
      "id": "doi:10.xxxx/example",
      "label": "Short readable title",
      "year": 2025,
      "venue": "Venue",
      "evidence_level": "abstract",
      "open_access": "open"
    }
  ],
  "edges": [
    {
      "source": "doi:10.xxxx/citing",
      "target": "doi:10.xxxx/cited",
      "type": "cites"
    }
  ]
}
```

Keep the graph bounded. Prefer the core papers and their strongest one-hop relationships rather than rendering every returned result.

## Publication timeline

```json
{
  "view": "publication_timeline",
  "papers": [
    {
      "id": "doi:10.xxxx/example",
      "label": "Short readable title",
      "year": 2025,
      "source": "semantic_scholar",
      "evidence_level": "abstract"
    }
  ]
}
```

Show publication count and labeled key papers on a shared time axis. Do not infer a trend from incomplete provider coverage without saying so.

## Evidence matrix

```json
{
  "view": "evidence_matrix",
  "dimensions": ["dataset", "method", "metric", "limitation"],
  "papers": [
    {
      "id": "doi:10.xxxx/example",
      "label": "Short readable title",
      "evidence_level": "full_text",
      "values": {
        "dataset": "Named dataset",
        "method": "Named method",
        "metric": "Reported metric",
        "limitation": "Author-stated limitation"
      }
    }
  ]
}
```

Use `null` for missing data. Never fill gaps with model guesses.

## Interaction

When Visualize is available:

- Keep selection and filtering local to the view.
- For research drill-down, send a follow-up message containing the selected stable paper ID.
- Offer only actions supported by the workflow, such as “expand citations”, “find open PDF”, or “verify full-text evidence”.
- Include the requested action and selected ID in the follow-up prompt.

When Visualize is unavailable:

- Render networks with Mermaid only when labels and edges remain readable.
- Render timelines and evidence matrices as compact Markdown tables.
