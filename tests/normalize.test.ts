import { describe, expect, it } from "vitest";
import {
  buildVisualizationDataset,
  normalizeCitationResponse,
  normalizeDoi,
  normalizeSearchResponse,
} from "../src/normalize.js";

describe("paper normalization", () => {
  it("normalizes DOI variants and deduplicates records", () => {
    const normalized = normalizeSearchResponse(
      {
        results: [
          {
            title: "Retrieval-Augmented Generation",
            DOI: "https://doi.org/10.1000/ABC",
            year: 2024,
            source: "crossref",
          },
          {
            title: "Retrieval Augmented Generation",
            doi: "doi:10.1000/abc",
            abstract: "A study.",
            source: "openalex",
          },
        ],
      },
      "crossref",
    );

    expect(normalizeDoi("HTTPS://DOI.ORG/10.1000/ABC")).toBe("10.1000/abc");
    expect(normalized.duplicates_removed).toBe(1);
    expect(normalized.papers).toHaveLength(1);
    expect(normalized.papers[0]).toMatchObject({
      id: "doi:10.1000/abc",
      sources: ["crossref", "openalex"],
      evidence_level: "abstract",
    });
  });

  it("falls back to arXiv, PMID, and title plus year identifiers", () => {
    const normalized = normalizeSearchResponse({
      papers: [
        { title: "A", arxivId: "arXiv:2401.12345" },
        { title: "B", pmid: "123456" },
        { title: "C: A Study", year: 2025 },
      ],
    });
    expect(normalized.papers.map((paper) => paper.id)).toEqual([
      "arxiv:2401.12345",
      "pmid:123456",
      "title:c a study:2025",
    ]);
  });

  it("merges an identifier-less source with a DOI record by title and year", () => {
    const normalized = normalizeSearchResponse({
      papers: [
        {
          title: "A Unified Study of Retrieval",
          doi: "10.1000/unified",
          year: 2025,
          source: "crossref",
        },
        {
          title: "A unified study of retrieval",
          year: 2025,
          abstract: "Full metadata from another source.",
          source: "openalex",
        },
      ],
    });

    expect(normalized.duplicates_removed).toBe(1);
    expect(normalized.papers).toHaveLength(1);
    expect(normalized.papers[0]).toMatchObject({
      id: "doi:10.1000/unified",
      doi: "10.1000/unified",
      sources: ["crossref", "openalex"],
      evidence_level: "abstract",
    });
  });

  it("upgrades a title-only record to a stable identifier when it arrives later", () => {
    const normalized = normalizeSearchResponse({
      papers: [
        {
          title: "Identifier Upgrade",
          year: 2024,
          source: "repository",
        },
        {
          title: "Identifier Upgrade",
          year: 2024,
          pmcid: "PMC12345",
          source: "pmc",
        },
      ],
    });

    expect(normalized.papers).toHaveLength(1);
    expect(normalized.papers[0]?.id).toBe("pmcid:pmc12345");
  });

  it("does not merge conflicting stable identifiers by title and year", () => {
    const normalized = normalizeSearchResponse({
      papers: [
        {
          title: "Annual Research Report",
          year: 2025,
          doi: "10.1000/report-a",
        },
        {
          title: "Annual Research Report",
          year: 2025,
          doi: "10.1000/report-b",
        },
      ],
    });

    expect(normalized.duplicates_removed).toBe(0);
    expect(normalized.papers.map((paper) => paper.doi)).toEqual([
      "10.1000/report-a",
      "10.1000/report-b",
    ]);
  });

  it("creates directed citation edges and bounded visualization data", () => {
    const normalized = normalizeCitationResponse(
      {
        data: [
          {
            citingPaper: {
              title: "Citing paper",
              doi: "10.1000/citing",
              year: 2026,
            },
          },
        ],
      },
      "doi:10.1000/target",
      "citations",
    );
    const visualization = buildVisualizationDataset(
      normalized.papers,
      normalized.edges,
    );
    expect(normalized.edges).toEqual([
      {
        source: "doi:10.1000/citing",
        target: "doi:10.1000/target",
        type: "cites",
      },
    ]);
    expect(visualization.publication_timeline.papers).toHaveLength(1);
    expect(visualization.evidence_matrix.dimensions).toEqual([
      "dataset",
      "method",
      "metric",
      "limitation",
    ]);
  });
});
