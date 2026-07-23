import { describe, expect, it } from "vitest";
import { parseCatalog, toolAnnotations } from "../src/catalog.js";

describe("paper-search tool catalog", () => {
  it("preserves every valid upstream descriptor", () => {
    const catalog = parseCatalog({
      ok: true,
      tools: [
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
          name: "download_paper",
          description: "Download a paper",
          inputSchema: {
            type: "object",
            properties: { savePath: { type: "string" } },
          },
        },
      ],
    });

    expect(catalog.map((tool) => tool.name)).toEqual([
      "search_crossref",
      "download_paper",
    ]);
    expect(catalog[0]?.inputSchema).toMatchObject({
      properties: { query: { type: "string" } },
    });
  });

  it("rejects duplicate, invalid, or non-object descriptors", () => {
    expect(() =>
      parseCatalog({
        tools: [
          { name: "search_ok", inputSchema: { type: "object" } },
          { name: "search_ok", inputSchema: { type: "object" } },
        ],
      }),
    ).toThrow("duplicate");
    expect(() =>
      parseCatalog({
        tools: [{ name: "search;bad", inputSchema: { type: "object" } }],
      }),
    ).toThrow("invalid tool name");
    expect(() =>
      parseCatalog({
        tools: [{ name: "search_bad", inputSchema: "not-an-object" }],
      }),
    ).toThrow("inputSchema");
  });

  it("marks downloads as writes and searches as read-only", () => {
    expect(toolAnnotations("search_crossref")).toMatchObject({
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: true,
    });
    expect(toolAnnotations("download_with_fallback")).toMatchObject({
      readOnlyHint: false,
      destructiveHint: false,
      openWorldHint: true,
    });
  });
});
