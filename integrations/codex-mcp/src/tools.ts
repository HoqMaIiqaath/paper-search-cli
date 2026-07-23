import path from "node:path";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { envelope } from "./domain.js";
import {
  buildVisualizationDataset,
  normalizeCitationResponse,
  normalizeSearchResponse,
} from "./normalize.js";
import {
  PaperSearchRunner,
  type PaperSearchClient,
  prepareDownloadDirectory,
  validateText,
  validateYearFilter,
} from "./paper-search-runner.js";

const Platforms = [
  "crossref",
  "openalex",
  "pubmed",
  "pmc",
  "europepmc",
  "arxiv",
  "biorxiv",
  "medrxiv",
  "semantic",
  "iacr",
  "core",
  "openaire",
  "googlescholar",
  "webofscience",
  "sciencedirect",
  "springer",
  "scopus",
  "unpaywall",
  "dblp",
  "ieee",
  "acm",
  "usenix",
  "openreview",
] as const;

export const SearchInputSchema = z
  .object({
    query: z.string().min(1).max(2_000),
    platform: z.enum(Platforms).optional(),
    sources: z.array(z.enum(Platforms)).min(1).max(8).optional(),
    limit: z.number().int().min(1).max(100).default(20),
    year: z.string().optional(),
    author: z.string().max(512).optional(),
    journal: z.string().max(512).optional(),
    sort_by: z.enum(["relevance", "date", "citations"]).default("relevance"),
    sort_order: z.enum(["asc", "desc"]).default("desc"),
  })
  .refine((input) => !(input.platform && input.sources), {
    message: "Use platform or sources, not both",
  });

export const CitationInputSchema = z
  .object({
    direction: z.enum(["citations", "references"]).default("citations"),
    paper_id: z.string().min(1).max(512).optional(),
    doi: z.string().min(1).max(512).optional(),
    arxiv_id: z.string().min(1).max(512).optional(),
    limit: z.number().int().min(1).max(100).default(20),
  })
  .refine(
    (input) =>
      [input.paper_id, input.doi, input.arxiv_id].filter(Boolean).length === 1,
    { message: "Provide exactly one of paper_id, doi, or arxiv_id" },
  );

export const JournalInputSchema = z.object({
  journals: z.array(z.string().min(1).max(512)).min(1).max(50),
  include_raw: z.boolean().default(false),
});

export const DownloadInputSchema = z.object({
  source: z.enum(Platforms),
  paper_id: z.string().min(1).max(512),
  doi: z.string().min(1).max(512).optional(),
  title: z.string().min(1).max(2_000).optional(),
  relative_path: z.string().max(512).optional(),
  fallback_policy: z
    .enum(["open_access_only", "include_scihub"])
    .default("open_access_only"),
});

export const SnippetInputSchema = z.object({
  query: z.string().min(1).max(2_000),
  limit: z.number().int().min(1).max(100).default(5),
  year: z.string().optional(),
  paper_ids: z.array(z.string().min(1).max(512)).max(100).optional(),
  fields_of_study: z.array(z.string().min(1).max(128)).max(20).optional(),
  minimum_citation_count: z.number().int().nonnegative().optional(),
});

export interface ToolContext {
  runner: PaperSearchClient;
  downloadRoot: string;
}

export function createToolContext(
  runner: PaperSearchClient = new PaperSearchRunner(),
  downloadRoot = process.env.PAPER_RESEARCH_DOWNLOAD_ROOT ??
    path.resolve(process.cwd(), "research"),
): ToolContext {
  return { runner, downloadRoot };
}

export async function searchPapers(
  input: z.infer<typeof SearchInputSchema>,
  context: ToolContext,
): Promise<CallToolResult> {
  try {
    const query = validateText(input.query, "query");
    const year = validateYearFilter(input.year);
    const args: Record<string, unknown> = {
      query,
      maxResults: input.limit,
      sortBy: input.sort_by,
      sortOrder: input.sort_order,
    };
    if (input.platform) args.platform = input.platform;
    if (input.sources) args.sources = input.sources.join(",");
    if (year) args.year = year;
    if (input.author) args.author = validateText(input.author, "author");
    if (input.journal) args.journal = validateText(input.journal, "journal");

    const raw = await context.runner.runTool("search_papers", args);
    const normalized = normalizeSearchResponse(
      raw,
      input.platform ?? input.sources?.join(",") ?? "crossref",
    );
    return success(
      envelope(
        {
          ...normalized,
          visualization: buildVisualizationDataset(normalized.papers),
        },
        normalized.papers.some((paper) => paper.abstract)
          ? "abstract"
          : "metadata",
      ),
    );
  } catch (error) {
    return failure(error);
  }
}

export async function expandCitations(
  input: z.infer<typeof CitationInputSchema>,
  context: ToolContext,
): Promise<CallToolResult> {
  try {
    const tool =
      input.direction === "citations"
        ? "get_paper_citations"
        : "get_paper_references";
    const args: Record<string, unknown> = { limit: input.limit };
    if (input.paper_id) args.paperId = validateText(input.paper_id, "paper_id");
    if (input.doi) args.doi = validateText(input.doi, "doi");
    if (input.arxiv_id) args.arxivId = validateText(input.arxiv_id, "arxiv_id");
    const targetId = input.doi
      ? `doi:${input.doi.toLowerCase().replace(/^doi:\s*/i, "")}`
      : input.arxiv_id
        ? `arxiv:${input.arxiv_id.toLowerCase().replace(/^arxiv:\s*/i, "")}`
        : `s2:${input.paper_id}`;
    const raw = await context.runner.runTool(tool, args);
    const normalized = normalizeCitationResponse(
      raw,
      targetId,
      input.direction,
    );
    return success(
      envelope(
        {
          ...normalized,
          visualization: buildVisualizationDataset(
            normalized.papers,
            normalized.edges,
          ),
        },
        normalized.papers.some((paper) => paper.abstract)
          ? "abstract"
          : "metadata",
      ),
    );
  } catch (error) {
    return failure(error);
  }
}

export async function getJournalMetrics(
  input: z.infer<typeof JournalInputSchema>,
  context: ToolContext,
): Promise<CallToolResult> {
  try {
    const journals = input.journals.map((journal) =>
      validateText(journal, "journal"),
    );
    const raw = await context.runner.runTool("query_journal_metrics", {
      journals,
      includeRaw: input.include_raw,
    });
    return success(envelope({ journals, raw }, "metadata"));
  } catch (error) {
    return failure(error);
  }
}

export async function resolveOpenPdf(
  input: z.infer<typeof DownloadInputSchema>,
  context: ToolContext,
): Promise<CallToolResult> {
  try {
    const savePath = await prepareDownloadDirectory(
      context.downloadRoot,
      input.relative_path,
    );
    const raw = await context.runner.runTool("download_with_fallback", {
      source: input.source,
      paperId: validateText(input.paper_id, "paper_id"),
      ...(input.doi ? { doi: validateText(input.doi, "doi") } : {}),
      ...(input.title ? { title: validateText(input.title, "title") } : {}),
      savePath,
      useSciHub: input.fallback_policy === "include_scihub",
    });
    return success(
      envelope(
        {
          save_path: savePath,
          fallback_policy: input.fallback_policy,
          raw,
        },
        "metadata",
      ),
    );
  } catch (error) {
    return failure(error);
  }
}

export async function searchPaperSnippets(
  input: z.infer<typeof SnippetInputSchema>,
  context: ToolContext,
): Promise<CallToolResult> {
  try {
    const year = validateYearFilter(input.year);
    const raw = await context.runner.runTool("search_semantic_snippets", {
      query: validateText(input.query, "query"),
      limit: input.limit,
      ...(year ? { year } : {}),
      ...(input.paper_ids ? { paperIds: input.paper_ids } : {}),
      ...(input.fields_of_study
        ? { fieldsOfStudy: input.fields_of_study }
        : {}),
      ...(input.minimum_citation_count !== undefined
        ? { minCitationCount: input.minimum_citation_count }
        : {}),
    });
    return success(envelope({ raw }, "snippet"));
  } catch (error) {
    return failure(error);
  }
}

export async function getCapabilityStatus(
  context: ToolContext,
): Promise<CallToolResult> {
  try {
    const raw = sanitizeSecrets(await context.runner.doctor());
    return success(envelope({ raw }, "metadata"));
  } catch (error) {
    return failure(error);
  }
}

function success(payload: unknown): CallToolResult {
  const structuredContent =
    payload !== null && typeof payload === "object"
      ? (payload as Record<string, unknown>)
      : { value: payload };
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(payload, null, 2),
      },
    ],
    structuredContent,
  };
}

function failure(error: unknown): CallToolResult {
  const message =
    error instanceof Error ? error.message : "Unknown paper research error";
  const payload = {
    ok: false,
    error: message.replace(
      /(?:api[_-]?key|token|secret|authorization)\s*[=:]\s*\S+/gi,
      "$1=[REDACTED]",
    ),
  };
  return {
    content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
    structuredContent: payload,
    isError: true,
  };
}

function sanitizeSecrets(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitizeSecrets);
  if (value === null || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
      key,
      /(?:key|token|secret|authorization|password)/i.test(key)
        ? "[REDACTED]"
        : sanitizeSecrets(entry),
    ]),
  );
}
