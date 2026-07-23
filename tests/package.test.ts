import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ADAPTER_VERSION } from "../src/server.js";

describe("built package entrypoints", () => {
  it("emits every declared binary at the package root", async () => {
    const packageJson = JSON.parse(
      await readFile(path.resolve("package.json"), "utf8"),
    ) as { bin: Record<string, string> };

    const checks = Object.values(packageJson.bin).map(async (relativePath) => {
      const absolutePath = path.resolve(relativePath);
      await expect(access(absolutePath)).resolves.toBeUndefined();
    });

    await Promise.all(checks);
  });

  it("keeps the package, plugin, and MCP identities aligned", async () => {
    const packageJson = JSON.parse(
      await readFile(path.resolve("package.json"), "utf8"),
    ) as {
      name: string;
      version: string;
      dependencies: Record<string, string>;
      scripts: Record<string, string>;
    };
    const pluginJson = JSON.parse(
      await readFile(path.resolve(".codex-plugin/plugin.json"), "utf8"),
    ) as { name: string; version: string };
    const mcpJson = JSON.parse(
      await readFile(path.resolve(".mcp.json"), "utf8"),
    ) as { mcpServers: Record<string, unknown> };

    expect(packageJson.name).toBe("paper-search-codex");
    expect(pluginJson.name).toBe(packageJson.name);
    expect(pluginJson.version).toBe(packageJson.version);
    expect(ADAPTER_VERSION).toBe(packageJson.version);
    expect(packageJson.scripts.prepare).toBe("npm run build");
    expect(packageJson.dependencies["paper-search-cli"]).toMatch(
      /^\d+\.\d+\.\d+$/,
    );
    expect(Object.keys(mcpJson.mcpServers)).toEqual(["paper-search"]);
  });
});
