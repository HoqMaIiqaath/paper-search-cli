import path from "node:path";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type CallToolResult,
  type Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { toolAnnotations } from "./catalog.js";
import {
  PaperSearchRunner,
  prepareDownloadDirectory,
  type PaperSearchClient,
} from "./paper-search-runner.js";
import {
  CitationInputSchema,
  SearchInputSchema,
  createToolContext,
  expandCitations,
  getCapabilityStatus,
  searchPapers,
} from "./tools.js";

export interface ServerOptions {
  downloadRoot?: string;
}

const RESEARCH_TOOLS: Tool[] = [
  {
    name: "research_search_and_deduplicate",
    description:
      "Search scholarly providers and return normalized, deduplicated papers.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string" },
        platform: { type: "string" },
        sources: { type: "array", items: { type: "string" } },
        limit: { type: "integer", minimum: 1, maximum: 100 },
        year: { type: "string" },
        author: { type: "string" },
        journal: { type: "string" },
        sort_by: { type: "string", enum: ["relevance", "date", "citations"] },
        sort_order: { type: "string", enum: ["asc", "desc"] },
      },
      required: ["query"],
      additionalProperties: false,
    },
    annotations: toolAnnotations("research_search_and_deduplicate"),
  },
  {
    name: "research_expand_citation_graph",
    description:
      "Expand citations or references from a DOI, arXiv ID, or Semantic Scholar paper ID.",
    inputSchema: {
      type: "object",
      properties: {
        direction: { type: "string", enum: ["citations", "references"] },
        paper_id: { type: "string" },
        doi: { type: "string" },
        arxiv_id: { type: "string" },
        limit: { type: "integer", minimum: 1, maximum: 100 },
      },
      additionalProperties: false,
    },
    annotations: toolAnnotations("research_expand_citation_graph"),
  },
  {
    name: "research_get_capability_status",
    description:
      "Report paper-search-cli installation, credentials, and optional capability status.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
    annotations: toolAnnotations("research_get_capability_status"),
  },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function success(value: unknown): CallToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(value, null, 2) }],
    structuredContent: isRecord(value) ? value : { result: value },
  };
}

function failure(error: unknown): CallToolResult {
  return {
    isError: true,
    content: [
      {
        type: "text",
        text: error instanceof Error ? error.message : String(error),
      },
    ],
  };
}

async function secureDownloadArguments(
  name: string,
  args: Record<string, unknown>,
  downloadRoot: string,
): Promise<Record<string, unknown>> {
  if (!["download_paper", "download_with_fallback", "search_scihub"].includes(name)) {
    return args;
  }
  const secured = { ...args };
  const needsSavePath = name !== "search_scihub" || secured.downloadPdf === true;
  if (needsSavePath) {
    const requested =
      typeof secured.savePath === "string" ? secured.savePath : ".";
    secured.savePath = await prepareDownloadDirectory(downloadRoot, requested);
  }
  if (name === "download_with_fallback" && secured.useSciHub === undefined) {
    secured.useSciHub = false;
  }
  return secured;
}

export async function createPaperResearchServer(
  runner: PaperSearchClient = new PaperSearchRunner(),
  options: ServerOptions = {},
): Promise<Server> {
  const catalog = await runner.listTools();
  const allowedTools = new Set(catalog.map((tool) => tool.name));
  const downloadRoot = path.resolve(
    options.downloadRoot ??
      process.env.PAPER_RESEARCH_DOWNLOAD_ROOT ??
      path.join(process.cwd(), "research"),
  );
  const context = createToolContext(runner, downloadRoot);
  const server = new Server(
    { name: "paper-research", version: "0.2.0" },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      ...catalog.map((tool) => ({
        ...tool,
        annotations: toolAnnotations(tool.name),
      })),
      ...RESEARCH_TOOLS,
    ],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const name = request.params.name;
    const args = isRecord(request.params.arguments)
      ? request.params.arguments
      : {};
    try {
      if (name === "research_search_and_deduplicate") {
        return await searchPapers(SearchInputSchema.parse(args), context);
      }
      if (name === "research_expand_citation_graph") {
        return await expandCitations(CitationInputSchema.parse(args), context);
      }
      if (name === "research_get_capability_status") {
        return await getCapabilityStatus(context);
      }
      if (!allowedTools.has(name)) {
        return failure(`Unknown or unavailable paper-search tool: ${name}`);
      }
      const safeArgs = await secureDownloadArguments(name, args, downloadRoot);
      return success(await runner.runTool(name, safeArgs));
    } catch (error) {
      return failure(error);
    }
  });

  return server;
}
