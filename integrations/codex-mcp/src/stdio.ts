#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createPaperResearchServer } from "./server.js";

async function main(): Promise<void> {
  const server = await createPaperResearchServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[paper-research] ${message}`);
  process.exitCode = 1;
});
