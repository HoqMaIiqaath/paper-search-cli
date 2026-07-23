import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { PaperSearchRunner, type CommandExecutor } from "../src/paper-search-runner.js";
import {
  createToolContext,
  getCapabilityStatus,
  resolveOpenPdf,
  searchPaperSnippets,
  searchPapers,
} from "../src/tools.js";

function runnerFor(output: unknown, onArgs?: (args: readonly string[]) => void) {
  const execute = vi.fn<CommandExecutor>(
    async (_binary, args) => {
      onArgs?.(args);
      return { stdout: JSON.stringify(output), stderr: "" };
    },
  );
  return new PaperSearchRunner("paper-search", execute);
}

describe("tool handlers", () => {
  it("returns normalized search results and visualization datasets", async () => {
    const context = createToolContext(
      runnerFor({
        papers: [
          {
            title: "Paper",
            doi: "10.1000/paper",
            abstract: "Abstract",
            year: 2025,
          },
        ],
      }),
    );
    const result = await searchPapers(
      {
        query: "retrieval augmented generation",
        sources: ["crossref", "openalex"],
        limit: 10,
        sort_by: "relevance",
        sort_order: "desc",
      },
      context,
    );
    expect(result.isError).not.toBe(true);
    expect(result.structuredContent).toMatchObject({
      ok: true,
      data: {
        papers: [{ id: "doi:10.1000/paper" }],
        visualization: {
          citation_network: { nodes: [{ id: "doi:10.1000/paper" }] },
        },
      },
    });
  });

  it("forces open-access-only download unless Sci-Hub is explicit", async () => {
    const downloadRoot = await mkdtemp(path.join(os.tmpdir(), "paper-research-"));
    let jsonArgs: Record<string, unknown> = {};
    const context = createToolContext(
      runnerFor({ ok: true }, (args) => {
        jsonArgs = JSON.parse(args[3]!) as Record<string, unknown>;
      }),
      downloadRoot,
    );
    const result = await resolveOpenPdf(
      {
        source: "crossref",
        paper_id: "10.1000/example",
        relative_path: "topic",
        fallback_policy: "open_access_only",
      },
      context,
    );
    expect(result.isError).not.toBe(true);
    expect(jsonArgs.useSciHub).toBe(false);
    expect(jsonArgs.savePath).toBe(path.join(downloadRoot, "topic"));
  });

  it("labels snippet results as snippet evidence", async () => {
    const result = await searchPaperSnippets(
      {
        query: "propensity score matching",
        limit: 5,
      },
      createToolContext(runnerFor({ snippets: [] })),
    );
    expect(result.structuredContent).toMatchObject({
      ok: true,
      provenance: { evidence_level: "snippet" },
    });
  });

  it("redacts secret-looking fields from capability status", async () => {
    const result = await getCapabilityStatus(
      createToolContext(
        runnerFor({ config: { SEMANTIC_SCHOLAR_API_KEY: "secret-value" } }),
      ),
    );
    expect(JSON.stringify(result.structuredContent)).not.toContain(
      "secret-value",
    );
    expect(JSON.stringify(result.structuredContent)).toContain("[REDACTED]");
  });

  it("returns actionable tool errors without stack traces", async () => {
    const execute: CommandExecutor = async () => {
      throw new Error("provider unavailable");
    };
    const result = await searchPapers(
      {
        query: "test",
        platform: "crossref",
        limit: 1,
        sort_by: "relevance",
        sort_order: "desc",
      },
      createToolContext(new PaperSearchRunner("paper-search", execute)),
    );
    expect(result.isError).toBe(true);
    expect(JSON.stringify(result.structuredContent)).toContain(
      "provider unavailable",
    );
    expect(JSON.stringify(result.structuredContent)).not.toContain(
      "at searchPapers",
    );
  });
});
