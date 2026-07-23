import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import type { PaperSearchToolDescriptor } from "../src/catalog.js";
import type { PaperSearchClient } from "../src/paper-search-runner.js";
import { createPaperResearchServer } from "../src/server.js";

function fakeClient(
  catalog: PaperSearchToolDescriptor[],
): PaperSearchClient & { runTool: ReturnType<typeof vi.fn> } {
  return {
    listTools: async () => catalog,
    runTool: vi.fn(async (name: string, args: Record<string, unknown>) => ({
      ok: true,
      tool: name,
      args,
      data: [],
    })),
    doctor: async () => ({ ok: true, capabilityProfile: {} }),
  };
}

async function connectedClient(runner: PaperSearchClient) {
  const server = await createPaperResearchServer(runner, {
    downloadRoot: path.resolve("E:/paper-downloads"),
  });
  const client = new Client({ name: "paper-research-test", version: "1.0.0" });
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  await client.connect(clientTransport);
  return { server, client };
}

describe("dynamic MCP bridge", () => {
  it("lists every upstream tool plus namespaced research tools", async () => {
    const runner = fakeClient([
      {
        name: "search_crossref",
        description: "Search Crossref",
        inputSchema: {
          type: "object",
          properties: { query: { type: "string" } },
          required: ["query"],
        },
      },
      {
        name: "get_paper_by_doi",
        description: "Get a paper",
        inputSchema: { type: "object", properties: {} },
      },
    ]);
    const { server, client } = await connectedClient(runner);

    const tools = await client.listTools();
    expect(tools.tools.map((tool) => tool.name)).toEqual([
      "search_crossref",
      "get_paper_by_doi",
      "research_search_and_deduplicate",
      "research_expand_citation_graph",
      "research_get_capability_status",
    ]);

    await client.close();
    await server.close();
  });

  it("passes valid calls unchanged through --json-args boundary", async () => {
    const runner = fakeClient([
      {
        name: "search_crossref",
        description: "Search Crossref",
        inputSchema: { type: "object", properties: {} },
      },
    ]);
    const { server, client } = await connectedClient(runner);

    const result = await client.callTool({
      name: "search_crossref",
      arguments: { query: "RAG", maxResults: 3 },
    });

    expect(result.isError).not.toBe(true);
    expect(runner.runTool).toHaveBeenCalledWith("search_crossref", {
      query: "RAG",
      maxResults: 3,
    });

    await client.close();
    await server.close();
  });

  it("rejects unknown tools without executing the CLI", async () => {
    const runner = fakeClient([]);
    const { server, client } = await connectedClient(runner);

    const result = await client.callTool({
      name: "run_any_command",
      arguments: { command: "whoami" },
    });

    expect(result.isError).toBe(true);
    expect(runner.runTool).not.toHaveBeenCalled();

    await client.close();
    await server.close();
  });

  it("restricts savePath and disables implicit Sci-Hub fallback", async () => {
    const runner = fakeClient([
      {
        name: "download_with_fallback",
        description: "Download",
        inputSchema: { type: "object", properties: {} },
      },
    ]);
    const { server, client } = await connectedClient(runner);

    const denied = await client.callTool({
      name: "download_with_fallback",
      arguments: {
        source: "crossref",
        paperId: "10.1000/example",
        savePath: "../outside",
      },
    });
    expect(denied.isError).toBe(true);
    expect(runner.runTool).not.toHaveBeenCalled();

    await client.callTool({
      name: "download_with_fallback",
      arguments: {
        source: "crossref",
        paperId: "10.1000/example",
        savePath: "topic",
      },
    });
    expect(runner.runTool).toHaveBeenCalledWith(
      "download_with_fallback",
      expect.objectContaining({
        savePath: path.resolve("E:/paper-downloads/topic"),
        useSciHub: false,
      }),
    );

    await client.close();
    await server.close();
  });
});
