import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, stat } from "node:fs/promises";
import path from "node:path";
import {
  parseCatalog,
  type PaperSearchToolDescriptor,
} from "./catalog.js";

export interface CommandResult {
  stdout: string;
  stderr: string;
}

export interface CommandOptions {
  timeout: number;
  maxBuffer: number;
}

export type CommandExecutor = (
  binary: string,
  args: readonly string[],
  options: CommandOptions,
) => Promise<CommandResult>;

export interface PaperSearchInvocation {
  binary: string;
  prefixArgs: string[];
}

export interface InvocationResolutionOptions {
  platform?: NodeJS.Platform;
  pathValue?: string;
  nodeBinary?: string;
  exists?: (candidate: string) => boolean;
}

export function resolvePaperSearchInvocation(
  options: InvocationResolutionOptions = {},
): PaperSearchInvocation {
  const configured = process.env.PAPER_SEARCH_BINARY;
  if (configured) {
    return { binary: configured, prefixArgs: [] };
  }

  const platform = options.platform ?? process.platform;
  if (platform === "win32") {
    const exists = options.exists ?? existsSync;
    const pathValue = options.pathValue ?? process.env.PATH ?? "";
    for (const directory of pathValue.split(";").filter(Boolean)) {
      const cliEntry = path.join(
        directory,
        "node_modules",
        "paper-search-cli",
        "dist",
        "cli.js",
      );
      if (exists(cliEntry)) {
        return {
          binary: options.nodeBinary ?? process.execPath,
          prefixArgs: [cliEntry],
        };
      }
    }
  }

  return { binary: "paper-search", prefixArgs: [] };
}

const defaultExecutor: CommandExecutor = (binary, args, options) =>
  new Promise((resolve, reject) => {
    execFile(
      binary,
      [...args],
      {
        encoding: "utf8",
        timeout: options.timeout,
        maxBuffer: options.maxBuffer,
        windowsHide: true,
      },
      (error, stdout, stderr) => {
        if (error) {
          const detail = stderr.trim() || error.message;
          reject(new Error(`paper-search failed: ${detail}`));
          return;
        }
        resolve({ stdout, stderr });
      },
    );
  });

export function validateText(value: string, label: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`${label} must not be empty`);
  }
  if (trimmed.includes("\u0000")) {
    throw new Error(`${label} contains a NUL character`);
  }
  if (trimmed.length > 2_000) {
    throw new Error(`${label} exceeds 2000 characters`);
  }
  return trimmed;
}

export function validateYearFilter(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  if (!/^(?:19|20)\d{2}(?:-(?:(?:19|20)\d{2})?)?$/.test(trimmed)) {
    throw new Error("year must be YYYY, YYYY-YYYY, or YYYY-");
  }
  return trimmed;
}

export function resolveDownloadPath(root: string, requested?: string): string {
  const rootPath = path.resolve(root);
  const targetPath = path.resolve(rootPath, requested ?? ".");
  const relative = path.relative(rootPath, targetPath);
  if (
    relative === ".." ||
    relative.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relative)
  ) {
    throw new Error("download path must stay inside PAPER_RESEARCH_DOWNLOAD_ROOT");
  }
  return targetPath;
}

export async function prepareDownloadDirectory(
  root: string,
  requested?: string,
): Promise<string> {
  const target = resolveDownloadPath(root, requested);
  try {
    const existing = await stat(target);
    if (!existing.isDirectory()) {
      throw new Error("download target exists and is not a directory");
    }
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      (error as NodeJS.ErrnoException).code === "ENOENT"
    ) {
      await mkdir(target, { recursive: true });
    } else {
      throw error;
    }
  }
  return target;
}

export interface PaperSearchClient {
  listTools(): Promise<PaperSearchToolDescriptor[]>;
  runTool(toolName: string, args: Record<string, unknown>): Promise<unknown>;
  doctor(): Promise<unknown>;
}

export class PaperSearchRunner implements PaperSearchClient {
  private readonly binary: string;
  private readonly prefixArgs: string[];

  constructor(
    binary: string | undefined = undefined,
    private readonly execute: CommandExecutor = defaultExecutor,
    private readonly timeoutMs = 60_000,
  ) {
    const invocation = binary
      ? { binary, prefixArgs: [] }
      : resolvePaperSearchInvocation();
    this.binary = invocation.binary;
    this.prefixArgs = invocation.prefixArgs;
  }

  async runTool(
    toolName: string,
    args: Record<string, unknown>,
  ): Promise<unknown> {
    const safeName = validateText(toolName, "toolName");
    if (!/^[a-z][a-z0-9_]*$/.test(safeName)) {
      throw new Error("toolName is invalid");
    }
    const result = await this.execute(
      this.binary,
      [...this.prefixArgs, "run", safeName, "--json-args", JSON.stringify(args)],
      { timeout: this.timeoutMs, maxBuffer: 10 * 1024 * 1024 },
    );
    return parseJsonOutput(result.stdout);
  }

  async listTools(): Promise<PaperSearchToolDescriptor[]> {
    const result = await this.execute(
      this.binary,
      [...this.prefixArgs, "tools"],
      { timeout: this.timeoutMs, maxBuffer: 10 * 1024 * 1024 },
    );
    return parseCatalog(parseJsonOutput(result.stdout));
  }

  async doctor(): Promise<unknown> {
    const result = await this.execute(
      this.binary,
      [...this.prefixArgs, "doctor", "--pretty"],
      { timeout: this.timeoutMs, maxBuffer: 10 * 1024 * 1024 },
    );
    return parseJsonOutput(result.stdout);
  }
}

function parseJsonOutput(stdout: string): unknown {
  const text = stdout.trim();
  if (!text) {
    throw new Error("paper-search returned empty output");
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("paper-search returned invalid JSON");
  }
}
