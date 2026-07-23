import { mkdtemp, rm, symlink } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  PaperSearchRunner,
  prepareDownloadDirectory,
  resolvePaperSearchInvocation,
  resolveDownloadPath,
  validateText,
  validateYearFilter,
  type CommandExecutor,
} from "../src/paper-search-runner.js";

describe("PaperSearchRunner", () => {
  it("resolves the bundled paper-search-cli dependency before PATH fallbacks", () => {
    const packageJson = path.join(
      "E:\\paper-search-codex",
      "node_modules",
      "paper-search-cli",
      "package.json",
    );
    const cliEntry = path.join(path.dirname(packageJson), "dist", "cli.js");

    const invocation = resolvePaperSearchInvocation({
      platform: "win32",
      pathValue: "",
      nodeBinary: "C:\\node\\node.exe",
      resolvePackage: (specifier) => {
        expect(specifier).toBe("paper-search-cli/package.json");
        return packageJson;
      },
      exists: (candidate) => candidate === cliEntry,
    });

    expect(invocation).toEqual({
      binary: "C:\\node\\node.exe",
      prefixArgs: [cliEntry],
    });
  });

  it("resolves the real npm CLI entry on Windows without invoking a shell", () => {
    const cliEntry = path.join(
      "C:\\fnm",
      "node_modules",
      "paper-search-cli",
      "dist",
      "cli.js",
    );
    const invocation = resolvePaperSearchInvocation({
      platform: "win32",
      pathValue: "C:\\fnm;C:\\Windows",
      nodeBinary: "C:\\node\\node.exe",
      resolvePackage: () => {
        throw new Error("not installed locally");
      },
      exists: (candidate) => candidate === cliEntry,
    });

    expect(invocation).toEqual({
      binary: "C:\\node\\node.exe",
      prefixArgs: [cliEntry],
    });
  });

  it("loads and validates the runtime tool catalog", async () => {
    const execute = vi.fn<CommandExecutor>().mockResolvedValue({
      stdout: JSON.stringify({
        ok: true,
        tools: [
          {
            name: "search_crossref",
            description: "Search Crossref",
            inputSchema: { type: "object", properties: {} },
          },
        ],
      }),
      stderr: "",
    });
    const runner = new PaperSearchRunner("paper-search", execute);

    const tools = await runner.listTools();

    expect(tools).toHaveLength(1);
    expect(tools[0]?.name).toBe("search_crossref");
    expect(execute).toHaveBeenCalledWith(
      "paper-search",
      ["tools"],
      expect.any(Object),
    );
  });

  it("passes a fixed executable and an argument array without a shell", async () => {
    const execute = vi.fn<CommandExecutor>().mockResolvedValue({
      stdout: JSON.stringify({ ok: true }),
      stderr: "",
    });
    const runner = new PaperSearchRunner("paper-search", execute);

    await runner.runTool("search_papers", {
      query: 'RAG"; Remove-Item -Recurse',
      maxResults: 2,
    });

    expect(execute).toHaveBeenCalledOnce();
    const [binary, args] = execute.mock.calls[0]!;
    expect(binary).toBe("paper-search");
    expect(args.slice(0, 3)).toEqual([
      "run",
      "search_papers",
      "--json-args",
    ]);
    expect(JSON.parse(args[3]!)).toEqual({
      query: 'RAG"; Remove-Item -Recurse',
      maxResults: 2,
    });
  });

  it("rejects invalid tool names and NUL text", async () => {
    const runner = new PaperSearchRunner(
      "paper-search",
      vi.fn<CommandExecutor>(),
    );
    await expect(runner.runTool("search;papers", {})).rejects.toThrow(
      "toolName is invalid",
    );
    expect(() => validateText("safe\u0000unsafe", "query")).toThrow(
      "NUL character",
    );
  });

  it("validates supported year filters", () => {
    expect(validateYearFilter("2020-2026")).toBe("2020-2026");
    expect(validateYearFilter("2020-")).toBe("2020-");
    expect(() => validateYearFilter("20xx")).toThrow("year must be");
  });

  it("keeps downloads under the configured root", () => {
    const root = path.resolve("E:/research-root");
    expect(resolveDownloadPath(root, "topic-a")).toBe(
      path.join(root, "topic-a"),
    );
    expect(() => resolveDownloadPath(root, "../outside")).toThrow(
      "must stay inside",
    );
  });

  it("rejects a symlink or junction that escapes the download root", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "paper-search-root-"));
    const outside = await mkdtemp(
      path.join(os.tmpdir(), "paper-search-outside-"),
    );
    const escape = path.join(root, "escape");
    try {
      await symlink(
        outside,
        escape,
        process.platform === "win32" ? "junction" : "dir",
      );
      await expect(
        prepareDownloadDirectory(root, "escape"),
      ).rejects.toThrow(/symbolic links|junctions/);
    } finally {
      await rm(root, { recursive: true, force: true });
      await rm(outside, { recursive: true, force: true });
    }
  });
});
