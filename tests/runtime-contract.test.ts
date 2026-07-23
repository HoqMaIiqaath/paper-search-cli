import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { PaperSearchRunner } from "../src/paper-search-runner.js";
import { createPaperSearchServer } from "../src/server.js";

describe("pinned paper-search-cli runtime contract", () => {
  it("loads the real catalog, runs an offline tool, and completes an MCP handshake", async () => {
    const runner = new PaperSearchRunner();
    const catalog = await runner.listTools();
    const names = catalog.map((tool) => tool.name);

    expect(names).toEqual(
      expect.arrayContaining([
        "search_crossref",
        "get_platform_status",
        "download_with_fallback",
      ]),
    );

    const status = await runner.runTool("get_platform_status", {
      validate: false,
    });
    expect(status).toBeTypeOf("object");

    const server = await createPaperSearchServer(runner, {
      downloadRoot: path.join(os.tmpdir(), "paper-search-runtime-contract"),
      allowSciHub: false,
    });
    const client = new Client({
      name: "paper-search-runtime-contract",
      version: "1.0.0",
    });
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);
    await client.connect(clientTransport);

    const mcpNames = (await client.listTools()).tools.map((tool) => tool.name);
    expect(mcpNames).toContain("search_crossref");
    expect(mcpNames).toContain("research_search_and_deduplicate");
    expect(mcpNames).not.toContain("download_paper");
    expect(mcpNames).not.toContain("search_scihub");

    await client.close();
    await server.close();
  }, 30_000);
});
