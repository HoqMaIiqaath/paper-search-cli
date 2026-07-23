#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createPaperSearchServer } from "./server.js";

async function main(): Promise<void> {
  const server = await createPaperSearchServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[paper-search] ${message}`);
  process.exitCode = 1;
});
