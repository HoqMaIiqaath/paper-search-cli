import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { realpath } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import type { PaperSearchToolDescriptor } from "../src/catalog.js";
import type { PaperSearchClient } from "../src/paper-search-runner.js";
import {
  createPaperSearchServer,
  type ServerOptions,
} from "../src/server.js";

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

async function connectedClient(
  runner: PaperSearchClient,
  options: ServerOptions = {},
) {
  const server = await createPaperSearchServer(runner, {
    downloadRoot: path.join(os.tmpdir(), "paper-search-codex-downloads"),
    ...options,
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
        savePath: await realpath(
          path.join(
            os.tmpdir(),
            "paper-search-codex-downloads",
            "topic",
          ),
        ),
        useSciHub: false,
      }),
    );

    await client.close();
    await server.close();
  });

  it("hides implicit and direct Sci-Hub tools until the server is authorized", async () => {
    const catalog: PaperSearchToolDescriptor[] = [
      {
        name: "download_paper",
        description: "Implicit fallback",
        inputSchema: { type: "object", properties: {} },
      },
      {
        name: "search_scihub",
        description: "Direct Sci-Hub",
        inputSchema: { type: "object", properties: {} },
      },
      {
        name: "check_scihub_mirrors",
        description: "Sci-Hub mirrors",
        inputSchema: { type: "object", properties: {} },
      },
      {
        name: "download_with_fallback",
        description: "Controllable fallback",
        inputSchema: { type: "object", properties: {} },
      },
    ];
    const runner = fakeClient(catalog);
    const { server, client } = await connectedClient(runner);

    const tools = await client.listTools();
    expect(tools.tools.map((tool) => tool.name)).not.toEqual(
      expect.arrayContaining([
        "download_paper",
        "search_scihub",
        "check_scihub_mirrors",
      ]),
    );
    expect(
      (
        tools.tools.find((tool) => tool.name === "download_with_fallback")
          ?.inputSchema.properties?.useSciHub as { default?: boolean }
      ).default,
    ).toBe(false);
    const denied = await client.callTool({
      name: "download_with_fallback",
      arguments: {
        source: "crossref",
        paperId: "10.1000/example",
        useSciHub: true,
      },
    });
    expect(denied.isError).toBe(true);
    expect(runner.runTool).not.toHaveBeenCalled();

    await client.close();
    await server.close();
  });

  it("exposes gated Sci-Hub tools only after explicit server authorization", async () => {
    const runner = fakeClient([
      {
        name: "search_scihub",
        description: "Direct Sci-Hub",
        inputSchema: { type: "object", properties: {} },
      },
      {
        name: "download_with_fallback",
        description: "Controllable fallback",
        inputSchema: { type: "object", properties: {} },
      },
    ]);
    const { server, client } = await connectedClient(runner, {
      allowSciHub: true,
    });

    expect((await client.listTools()).tools.map((tool) => tool.name)).toContain(
      "search_scihub",
    );
    await client.callTool({
      name: "download_with_fallback",
      arguments: {
        source: "crossref",
        paperId: "10.1000/example",
        useSciHub: true,
      },
    });
    expect(runner.runTool).toHaveBeenCalledWith(
      "download_with_fallback",
      expect.objectContaining({ useSciHub: true }),
    );

    await client.close();
    await server.close();
  });
});
