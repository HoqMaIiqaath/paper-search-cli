import type {
  CitationEdge,
  EvidenceLevel,
  OpenAccess,
  PaperRecord,
  VisualizationDataset,
} from "./domain.js";

type JsonRecord = Record<string, unknown>;

function record(value: unknown): JsonRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function firstString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (Array.isArray(value)) {
      const candidate = value.find(
        (item) => typeof item === "string" && item.trim(),
      );
      if (typeof candidate === "string") return candidate.trim();
    }
  }
  return null;
}

function firstNumber(...values: unknown[]): number | null {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) {
      return Math.trunc(value);
    }
    if (typeof value === "string" && /^\d+$/.test(value.trim())) {
      return Number.parseInt(value, 10);
    }
  }
  return null;
}

export function normalizeDoi(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value
    .trim()
    .replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, "")
    .replace(/^doi:\s*/i, "")
    .toLowerCase();
  return normalized.startsWith("10.") && normalized.includes("/")
    ? normalized
    : null;
}

export function normalizeArxivId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value
    .trim()
    .replace(/^arxiv:\s*/i, "")
    .replace(/^https?:\/\/arxiv\.org\/(?:abs|pdf)\//i, "")
    .replace(/\.pdf$/i, "");
  return normalized || null;
}

export function normalizeTitle(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizeAuthors(value: unknown): string[] {
  if (typeof value === "string") {
    return value
      .split(/\s*;\s*|\s+and\s+/i)
      .map((author) => author.trim())
      .filter(Boolean);
  }
  if (!Array.isArray(value)) return [];
  return value
    .map((author) => {
      if (typeof author === "string") return author.trim();
      const item = record(author);
      return firstString(
        item.name,
        [item.given, item.family].filter(Boolean).join(" "),
      );
    })
    .filter((author): author is string => Boolean(author));
}

function detectOpenAccess(item: JsonRecord): OpenAccess {
  const openAccess = record(item.openAccess ?? item.open_access);
  const value =
    item.isOpenAccess ??
    item.is_open_access ??
    openAccess.isOpenAccess ??
    openAccess.is_oa ??
    openAccess.status;
  if (value === true || value === "open" || value === "gold") return "open";
  if (value === false || value === "closed") return "closed";
  if (
    firstString(
      item.pdfUrl,
      item.pdf_url,
      item.openAccessPdf,
      openAccess.url,
      openAccess.url_for_pdf,
    )
  ) {
    return "open";
  }
  return "unknown";
}

function paperId(
  title: string,
  year: number | null,
  doi: string | null,
  arxivId: string | null,
  pmid: string | null,
  pmcid: string | null,
  semanticScholarId: string | null,
): string {
  if (doi) return `doi:${doi}`;
  if (arxivId) return `arxiv:${arxivId.toLowerCase()}`;
  if (pmid) return `pmid:${pmid}`;
  if (pmcid) return `pmcid:${pmcid.toLowerCase()}`;
  if (semanticScholarId) return `s2:${semanticScholarId}`;
  return `title:${normalizeTitle(title)}:${year ?? "unknown"}`;
}

export function normalizePaper(
  value: unknown,
  fallbackSource = "unknown",
  retrievedAt = new Date().toISOString(),
): PaperRecord | null {
  const item = record(value);
  const externalIds = record(item.externalIds ?? item.external_ids);
  const title = firstString(item.title, item.name);
  if (!title) return null;

  const doi = normalizeDoi(item.doi ?? item.DOI ?? externalIds.DOI);
  const arxivId = normalizeArxivId(
    item.arxivId ?? item.arxiv_id ?? externalIds.ArXiv,
  );
  const pmid = firstString(item.pmid, item.PMID, externalIds.PubMed);
  const pmcid = firstString(item.pmcid, item.PMCID, externalIds.PubMedCentral);
  const semanticScholarId = firstString(
    item.paperId,
    item.paper_id,
    item.semanticScholarId,
  );
  const year = firstNumber(
    item.year,
    item.publicationYear,
    item.publication_year,
  );
  const abstract = firstString(item.abstract, item.summary);
  const sourceValue = item.source ?? item.platform ?? fallbackSource;
  const sources = Array.isArray(sourceValue)
    ? sourceValue.filter((source): source is string => typeof source === "string")
    : [String(sourceValue)];
  const evidenceLevel: EvidenceLevel = abstract ? "abstract" : "metadata";

  return {
    id: paperId(
      title,
      year,
      doi,
      arxivId,
      pmid,
      pmcid,
      semanticScholarId,
    ),
    title,
    authors: normalizeAuthors(item.authors ?? item.author),
    year,
    venue: firstString(item.venue, item.journal, item.publisher),
    doi,
    arxiv_id: arxivId,
    pmid,
    pmcid,
    semantic_scholar_id: semanticScholarId,
    url: firstString(item.url, item.paperUrl, item.landing_page_url),
    abstract,
    citation_count: firstNumber(
      item.citationCount,
      item.citation_count,
      item.cited_by_count,
    ),
    sources: [...new Set(sources.map((source) => source.toLowerCase()))],
    open_access: detectOpenAccess(item),
    evidence_level: evidenceLevel,
    retrieved_at: retrievedAt,
  };
}
function candidateArray(raw: unknown, keys: string[]): unknown[] {
  if (Array.isArray(raw)) return raw;
  const top = record(raw);
  for (const key of keys) {
    if (Array.isArray(top[key])) return top[key] as unknown[];
  }
  const data = record(top.data);
  for (const key of keys) {
    if (Array.isArray(data[key])) return data[key] as unknown[];
  }
  if (Array.isArray(top.data)) return top.data;
  return [];
}

function stableDedupeKeys(paper: PaperRecord): string[] {
  return [
    paper.doi ? `doi:${paper.doi}` : null,
    paper.arxiv_id ? `arxiv:${paper.arxiv_id.toLowerCase()}` : null,
    paper.pmid ? `pmid:${paper.pmid}` : null,
    paper.pmcid ? `pmcid:${paper.pmcid.toLowerCase()}` : null,
    paper.semantic_scholar_id ? `s2:${paper.semantic_scholar_id}` : null,
  ].filter((key): key is string => key !== null);
}

function titleYearKey(paper: PaperRecord): string | null {
  return paper.year === null
    ? null
    : `title:${normalizeTitle(paper.title)}:${paper.year}`;
}

function papersMatch(left: PaperRecord, right: PaperRecord): boolean {
  const leftStable = stableDedupeKeys(left);
  const rightStable = stableDedupeKeys(right);
  const rightKeys = new Set(rightStable);
  if (leftStable.some((key) => rightKeys.has(key))) return true;
  if (leftStable.length && rightStable.length) return false;

  const leftTitleYear = titleYearKey(left);
  return leftTitleYear !== null && leftTitleYear === titleYearKey(right);
}

function mergePaperPair(
  existing: PaperRecord,
  incoming: PaperRecord,
): PaperRecord {
  const doi = existing.doi ?? incoming.doi;
  const arxivId = existing.arxiv_id ?? incoming.arxiv_id;
  const pmid = existing.pmid ?? incoming.pmid;
  const pmcid = existing.pmcid ?? incoming.pmcid;
  const semanticScholarId =
    existing.semantic_scholar_id ?? incoming.semantic_scholar_id;
  const year = existing.year ?? incoming.year;
  const title = existing.title || incoming.title;
  return {
    ...existing,
    id: paperId(
      title,
      year,
      doi,
      arxivId,
      pmid,
      pmcid,
      semanticScholarId,
    ),
    title,
    authors: existing.authors.length ? existing.authors : incoming.authors,
    year,
    venue: existing.venue ?? incoming.venue,
    doi,
    arxiv_id: arxivId,
    pmid,
    pmcid,
    semantic_scholar_id: semanticScholarId,
    abstract: existing.abstract ?? incoming.abstract,
    citation_count: existing.citation_count ?? incoming.citation_count,
    url: existing.url ?? incoming.url,
    open_access:
      existing.open_access === "open" || incoming.open_access === "open"
        ? "open"
        : existing.open_access === "closed" ||
            incoming.open_access === "closed"
          ? "closed"
          : "unknown",
    evidence_level:
      existing.evidence_level === "abstract" ||
      incoming.evidence_level === "abstract"
        ? "abstract"
        : "metadata",
    sources: [...new Set([...existing.sources, ...incoming.sources])],
  };
}

export function mergePapers(papers: PaperRecord[]): PaperRecord[] {
  const merged: PaperRecord[] = [];
  for (const paper of papers) {
    const matching = merged
      .map((candidate, index) =>
        papersMatch(candidate, paper) ? index : -1,
      )
      .filter((index) => index >= 0);
    if (!matching.length) {
      merged.push(paper);
      continue;
    }

    let combined = paper;
    for (const index of matching) {
      combined = mergePaperPair(merged[index]!, combined);
    }
    for (const index of [...matching].sort((a, b) => b - a)) {
      merged.splice(index, 1);
    }
    merged.push(combined);
  }
  return merged;
}

export function normalizeSearchResponse(
  raw: unknown,
  fallbackSource = "unknown",
): { papers: PaperRecord[]; duplicates_removed: number; raw: unknown } {
  const retrievedAt = new Date().toISOString();
  const candidates = candidateArray(raw, ["papers", "results", "items"]);
  const normalized = candidates
    .map((candidate) =>
      normalizePaper(candidate, fallbackSource, retrievedAt),
    )
    .filter((paper): paper is PaperRecord => paper !== null);
  const papers = mergePapers(normalized);
  return {
    papers,
    duplicates_removed: normalized.length - papers.length,
    raw,
  };
}

export function normalizeCitationResponse(
  raw: unknown,
  targetId: string,
  direction: "citations" | "references",
): { papers: PaperRecord[]; edges: CitationEdge[]; raw: unknown } {
  const candidates = candidateArray(raw, [
    direction,
    "papers",
    "results",
    "items",
  ]);
  const paperKey = direction === "citations" ? "citingPaper" : "citedPaper";
  const papers = mergePapers(
    candidates
      .map((candidate) => {
        const wrapper = record(candidate);
        return normalizePaper(wrapper[paperKey] ?? candidate, "semantic");
      })
      .filter((paper): paper is PaperRecord => paper !== null),
  );
  const edges = papers.map((paper): CitationEdge =>
    direction === "citations"
      ? { source: paper.id, target: targetId, type: "cites" }
      : { source: targetId, target: paper.id, type: "cites" },
  );
  return { papers, edges, raw };
}

export function buildVisualizationDataset(
  papers: PaperRecord[],
  edges: CitationEdge[] = [],
): VisualizationDataset {
  const boundedPapers = papers.slice(0, 100);
  const ids = new Set(boundedPapers.map((paper) => paper.id));
  const boundedEdges = edges
    .filter((edge) => ids.has(edge.source) && ids.has(edge.target))
    .slice(0, 300);
  const sourceCounts = new Map<string, number>();
  for (const paper of boundedPapers) {
    for (const source of paper.sources) {
      sourceCounts.set(source, (sourceCounts.get(source) ?? 0) + 1);
    }
  }
  return {
    citation_network: {
      nodes: boundedPapers,
      edges: boundedEdges,
    },
    publication_timeline: {
      papers: [...boundedPapers].sort(
        (a, b) => (a.year ?? 9999) - (b.year ?? 9999),
      ),
    },
    source_coverage: [...sourceCounts.entries()]
      .map(([source, paper_count]) => ({ source, paper_count }))
      .sort((a, b) => b.paper_count - a.paper_count),
    evidence_matrix: {
      dimensions: ["dataset", "method", "metric", "limitation"],
      papers: boundedPapers.map((paper) => ({
        id: paper.id,
        label: paper.title,
        evidence_level: paper.evidence_level,
        values: {
          dataset: null,
          method: null,
          metric: null,
          limitation: null,
        },
      })),
    },
  };
}
