import type { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";

export interface PaperSearchToolDescriptor {
  name: string;
  description?: string;
  inputSchema: {
    type: "object";
    [key: string]: unknown;
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseCatalog(raw: unknown): PaperSearchToolDescriptor[] {
  if (!isRecord(raw) || !Array.isArray(raw.tools)) {
    throw new Error("paper-search tools must return an object containing a tools array");
  }

  const names = new Set<string>();
  return raw.tools.map((entry, index) => {
    if (!isRecord(entry)) {
      throw new Error(`tool descriptor at index ${index} must be an object`);
    }
    const name = entry.name;
    if (typeof name !== "string" || !/^[a-z][a-z0-9_]*$/.test(name)) {
      throw new Error(`invalid tool name at index ${index}`);
    }
    if (names.has(name)) {
      throw new Error(`duplicate tool name: ${name}`);
    }
    names.add(name);
    if (!isRecord(entry.inputSchema)) {
      throw new Error(`inputSchema for ${name} must be an object`);
    }
    const description =
      typeof entry.description === "string" ? entry.description : undefined;
    return {
      name,
      ...(description ? { description } : {}),
      inputSchema: { ...entry.inputSchema, type: "object" as const },
    };
  });
}

export function toolAnnotations(name: string): ToolAnnotations {
  const writesFiles = new Set([
    "download_paper",
    "download_with_fallback",
    "search_scihub",
  ]).has(name);
  return {
    readOnlyHint: !writesFiles,
    destructiveHint: false,
    idempotentHint: !writesFiles,
    openWorldHint: true,
  };
}
